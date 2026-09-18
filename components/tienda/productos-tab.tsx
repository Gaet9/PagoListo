"use client";

import { createClient } from "@/lib/supabase/client";
import { insertCompraReposicion } from "@/lib/queries/compras";
import { recordProductoStockMovement } from "@/lib/queries/movimientos-stock";
import { deleteProducto, fetchProductosTotalsForNegocio, insertProducto, listProductosPage, updateProducto } from "@/lib/queries/productos";
import type { ProductoRow } from "@/lib/types/negocio";
import type { ProductosTotals } from "@/lib/queries/productos";
import type { KeysetCursor } from "@/lib/types/pagination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { BarcodeScannerDialog } from "@/components/tienda/barcode-scanner-dialog";
import { toast } from "sonner";
import { Camera, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

function strMoney(v: string | number | null | undefined) {
    if (v === null || v === undefined) return "";
    return String(v);
}

function parseMoney(s: string) {
    const n = parseFloat(String(s).replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseStock(s: string) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Vacío o inválido → null (campo obligatorio en alta). */
function parseRequiredMoney(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = parseFloat(t.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseRequiredStock(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

function sanitizeDecimalInput(raw: string) {
    // Allow digits and a single decimal separator ("," or ".").
    const only = raw.replace(/[^\d.,]/g, "");
    const firstSep = only.search(/[.,]/);
    if (firstSep === -1) return only;
    const intPart = only.slice(0, firstSep);
    const decPart = only
        .slice(firstSep + 1)
        .replace(/[.,]/g, "")
        .slice(0, 2); // DB will be numeric(12,2)
    const sep = only[firstSep] ?? ".";
    return `${intPart}${sep}${decPart}`;
}

function sanitizeIntInput(raw: string) {
    return raw.replace(/[^\d]/g, "");
}

function formatCreatedAtShort(iso: string) {
    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    }).format(new Date(iso));
}

function formatARS(n: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(n);
}

function resetRowFormFromRow(
    row: ProductoRow,
    setters: {
        setNombre: (v: string) => void;
        setBarcode: (v: string) => void;
        setPrecioCompra: (v: string) => void;
        setPrecioVenta: (v: string) => void;
        setStock: (v: string) => void;
        setActivo: (v: boolean) => void;
        setMsg: (v: string | null) => void;
    },
) {
    setters.setNombre(row.nombre);
    setters.setBarcode(row.barcode ?? "");
    setters.setPrecioCompra(strMoney(row.precio_compra));
    setters.setPrecioVenta(strMoney(row.precio_venta));
    setters.setStock(String(row.stock_actual));
    setters.setActivo(row.activo);
    setters.setMsg(null);
}

function ProductoRowEditor({
    row,
    onChanged,
    onSaved,
    isEditing,
    onStartEdit,
    onDoneEdit,
}: {
    row: ProductoRow;
    onChanged: () => void;
    onSaved: (patch: Pick<ProductoRow, "nombre" | "barcode" | "precio_compra" | "precio_venta" | "stock_actual" | "activo">) => void;
    isEditing: boolean;
    onStartEdit: () => void;
    onDoneEdit: () => void;
}) {
    const [nombre, setNombre] = useState(row.nombre);
    const [barcode, setBarcode] = useState(row.barcode ?? "");
    const [precioCompra, setPrecioCompra] = useState(strMoney(row.precio_compra));
    const [precioVenta, setPrecioVenta] = useState(strMoney(row.precio_venta));
    const [stock, setStock] = useState(String(row.stock_actual));
    const [activo, setActivo] = useState(row.activo);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const lastSavedKeyRef = useRef<string>("");
    const guardarInFlightRef = useRef(false);

    const resetFormFromRow = useCallback(() => {
        resetRowFormFromRow(row, {
            setNombre,
            setBarcode,
            setPrecioCompra,
            setPrecioVenta,
            setStock,
            setActivo,
            setMsg,
        });
        lastSavedKeyRef.current = "";
    }, [row]);

    useEffect(() => {
        if (isEditing) return;
        resetFormFromRow();
    }, [isEditing, resetFormFromRow]);

    const guardar = useCallback(
        async (opts?: { notifySuccess?: boolean }) => {
            const patch = {
                nombre: nombre.trim(),
                barcode: barcode.trim() || null,
                precio_compra: parseMoney(precioCompra),
                precio_venta: parseMoney(precioVenta),
                stock_actual: parseStock(stock),
                activo,
            };

            if (!patch.nombre) return false;

            const key = JSON.stringify(patch);
            if (key === lastSavedKeyRef.current) return true;
            if (guardarInFlightRef.current) return false;

            guardarInFlightRef.current = true;
            setSaving(true);
            setMsg(null);
            try {
                const supabase = createClient();
                const prevStock = row.stock_actual;
                if (patch.stock_actual > prevStock) {
                    const delta = patch.stock_actual - prevStock;
                    const { error: compErr } = await insertCompraReposicion(
                        supabase,
                        row.negocio_id,
                        [
                            {
                                producto_id: row.id,
                                cantidad: delta,
                                precio_unitario: patch.precio_compra,
                            },
                        ],
                        { notas: "Compra (desde ficha producto)" },
                    );
                    if (compErr) {
                        const desc = compErr instanceof Error ? compErr.message : String(compErr);
                        setMsg(desc);
                        toast.error("No se pudo registrar la compra de stock", { description: desc });
                        return false;
                    }
                }

                const { error } = await updateProducto(supabase, row.id, patch);
                if (error) {
                    setMsg(error.message);
                    toast.error("No se pudo guardar el producto", {
                        description: error.message,
                    });
                    return false;
                }
                if (patch.stock_actual < prevStock) {
                    const { error: movErr } = await recordProductoStockMovement(supabase, row.id, prevStock, patch.stock_actual, {
                        precioCompra: patch.precio_compra,
                        precioVenta: patch.precio_venta,
                    });
                    if (movErr) {
                        toast.warning("Producto guardado, pero no se registró el movimiento de stock", {
                            description: movErr.message,
                        });
                    }
                }
                lastSavedKeyRef.current = key;
                if (opts?.notifySuccess) {
                    toast.success("Producto guardado");
                    onSaved({
                        nombre: patch.nombre,
                        barcode: patch.barcode,
                        precio_compra: patch.precio_compra,
                        precio_venta: patch.precio_venta,
                        stock_actual: patch.stock_actual,
                        activo: patch.activo,
                    });
                }
                return true;
            } finally {
                guardarInFlightRef.current = false;
                setSaving(false);
            }
        },
        [activo, barcode, nombre, onSaved, precioCompra, precioVenta, row.id, row.negocio_id, row.stock_actual, stock],
    );

    useEffect(() => {
        if (!isEditing) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            resetFormFromRow();
            onDoneEdit();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isEditing, onDoneEdit, resetFormFromRow]);

    const eliminar = async () => {
        setDeleting(true);
        setMsg(null);
        const supabase = createClient();
        const { error } = await deleteProducto(supabase, row.id);
        setDeleting(false);
        if (error) {
            setMsg(error.message);
            toast.error("No se pudo eliminar el producto", {
                description: error.message,
            });
        } else {
            setDeleteOpen(false);
            toast.success("Producto eliminado");
            onChanged();
        }
    };

    const actions = (
        <>
            {saving ?
                <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' aria-label='Guardando' />
            :   null}

            <Button
                type='button'
                size='sm'
                variant='secondary'
                className='h-8 gap-1 px-2'
                disabled={deleting}
                onClick={async () => {
                    if (!isEditing) {
                        onStartEdit();
                        return;
                    }
                    const ok = await guardar({ notifySuccess: true });
                    if (ok) onDoneEdit();
                }}
                aria-label={isEditing ? "Listo" : "Modificar"}>
                {isEditing ?
                    <Check className='h-3 w-3 shrink-0' />
                :   <Pencil className='h-3 w-3 shrink-0' />}
            </Button>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger asChild>
                    <Button
                        type='button'
                        size='sm'
                        variant='destructive'
                        className='h-8 gap-1 px-2'
                        disabled={saving || deleting}
                        aria-label='Eliminar'>
                        {deleting ?
                            <Loader2 className='h-3 w-3 animate-spin shrink-0' />
                        :   <Trash2 className='h-3 w-3 shrink-0' />}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent size='sm'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            disabled={deleting}
                            onClick={(e) => {
                                e.preventDefault();
                                eliminar();
                            }}>
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );

    return (
        <>
            {/* Mobile: accordion per product (animated) */}
            <tr className='border-b align-middle sm:hidden'>
                <td className='p-2' colSpan={8}>
                    <Accordion type='single' collapsible>
                        <AccordionItem value={`prod-${row.id}`} className='border-b-0'>
                            <AccordionTrigger className='py-2 hover:no-underline'>
                                <span className='min-w-0 truncate font-medium text-sm'>{row.nombre}</span>
                            </AccordionTrigger>
                            <AccordionContent className='pt-2 pb-0'>
                                <div className='grid gap-3'>
                                    <div className='grid gap-1'>
                                        <p className='text-xs text-muted-foreground'>Código de barras</p>
                                        {isEditing ?
                                            <Input
                                                value={barcode}
                                                onChange={(e) => setBarcode(e.target.value)}
                                                className='h-9 text-sm'
                                            />
                                        :   <p className='text-sm'>{barcode || "-"}</p>}
                                    </div>

                                    <div className='grid grid-cols-3 gap-3'>
                                        <div className='grid gap-1'>
                                            <p className='text-xs text-muted-foreground'>Compra</p>
                                            {isEditing ?
                                                <Input
                                                    value={precioCompra}
                                                    onChange={(e) => setPrecioCompra(sanitizeDecimalInput(e.target.value))}
                                                    className='h-9 text-sm'
                                                    inputMode='decimal'
                                                    pattern='[0-9.,]*'
                                                />
                                            :   <p className='text-sm'>{precioCompra || "-"}</p>}
                                        </div>
                                        <div className='grid gap-1'>
                                            <p className='text-xs text-muted-foreground'>Venta</p>
                                            {isEditing ?
                                                <Input
                                                    value={precioVenta}
                                                    onChange={(e) => setPrecioVenta(sanitizeDecimalInput(e.target.value))}
                                                    className='h-9 text-sm'
                                                    inputMode='decimal'
                                                    pattern='[0-9.,]*'
                                                />
                                            :   <p className='text-sm'>{precioVenta || "-"}</p>}
                                        </div>
                                        <div className='grid gap-1'>
                                            <p className='text-xs text-muted-foreground'>Stock</p>
                                            {isEditing ?
                                                <Input
                                                    value={stock}
                                                    onChange={(e) => setStock(sanitizeIntInput(e.target.value))}
                                                    className='h-9 text-sm'
                                                    inputMode='numeric'
                                                    pattern='[0-9]*'
                                                />
                                            :   <p className='text-sm'>{stock || "0"}</p>}
                                        </div>
                                    </div>

                                    <div className='flex items-center justify-between gap-3'>
                                        <div className='flex items-center gap-2'>
                                            <Checkbox
                                                checked={activo}
                                                onCheckedChange={(v) => setActivo(v === true)}
                                                id={`act-m-${row.id}`}
                                                disabled={!isEditing}
                                            />
                                            <Label htmlFor={`act-m-${row.id}`} className='text-sm font-normal'>
                                                Activo
                                            </Label>
                                        </div>
                                        <p className='text-sm text-muted-foreground whitespace-nowrap'>
                                            {formatCreatedAtShort(row.created_at)}
                                        </p>
                                    </div>

                                    <div className='flex items-center justify-end gap-2'>{actions}</div>

                                    {msg ?
                                        <p className='text-caption text-destructive mt-1'>{msg}</p>
                                    :   null}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </td>
            </tr>

            {/* Desktop: single line per product */}
            <tr className='hidden sm:table-row border-b align-middle'>
                <td className='p-2'>
                    <Input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className='h-8 text-sm'
                        readOnly={!isEditing}
                    />
                </td>
                <td className='p-2'>
                    <Input
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        className='h-8 text-sm'
                        readOnly={!isEditing}
                    />
                </td>
                <td className='p-2'>
                    <Input
                        value={precioCompra}
                        onChange={(e) => setPrecioCompra(sanitizeDecimalInput(e.target.value))}
                        className='h-8 text-sm'
                        inputMode='decimal'
                        readOnly={!isEditing}
                        pattern='[0-9.,]*'
                    />
                </td>
                <td className='p-2'>
                    <Input
                        value={precioVenta}
                        onChange={(e) => setPrecioVenta(sanitizeDecimalInput(e.target.value))}
                        className='h-8 text-sm'
                        inputMode='decimal'
                        readOnly={!isEditing}
                        pattern='[0-9.,]*'
                    />
                </td>
                <td className='p-2'>
                    <Input
                        value={stock}
                        onChange={(e) => setStock(sanitizeIntInput(e.target.value))}
                        className='h-8 text-sm'
                        inputMode='numeric'
                        readOnly={!isEditing}
                        pattern='[0-9]*'
                    />
                </td>
                <td className='p-2'>
                    <div className='flex items-center gap-2 pt-1'>
                        <Checkbox
                            checked={activo}
                            onCheckedChange={(v) => setActivo(v === true)}
                            id={`act-${row.id}`}
                            disabled={!isEditing}
                        />
                        <Label htmlFor={`act-${row.id}`} className='text-xs font-normal hidden sm:inline'>
                            Sí
                        </Label>
                    </div>
                </td>
                <td className='p-2 text-xs text-muted-foreground whitespace-nowrap'>{formatCreatedAtShort(row.created_at)}</td>
                <td className='p-2'>
                    <div className='flex items-center justify-end gap-2'>{actions}</div>
                    {msg ?
                        <p className='text-caption text-destructive mt-1'>{msg}</p>
                    :   null}
                </td>
            </tr>
        </>
    );
}

type Props = { negocioId: string };

const PAGE_SIZE = 10;

export function ProductosTab({ negocioId }: Props) {
    const [rows, setRows] = useState<ProductoRow[]>([]);
    const [totals, setTotals] = useState<ProductosTotals | null>(null);
    const [totalsError, setTotalsError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<KeysetCursor | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [addAccordionValue, setAddAccordionValue] = useState<string>("");
    const [nNombre, setNNombre] = useState("");
    const [nBarcode, setNBarcode] = useState("");
    const [nPc, setNPc] = useState("");
    const [nPv, setNPv] = useState("");
    const [nStock, setNStock] = useState("");
    const [nActivo, setNActivo] = useState(true);
    const [adding, setAdding] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    const loadFirstPage = useCallback(async () => {
        setLoadingInitial(true);
        setError(null);
        setHasMore(true);
        setNextCursor(null);
        const supabase = createClient();
        const search = debouncedSearch || undefined;
        const [pageRes, totalsRes] = await Promise.all([
            listProductosPage(supabase, negocioId, {
                limit: PAGE_SIZE,
                cursor: null,
                search,
            }),
            fetchProductosTotalsForNegocio(supabase, negocioId, { search }),
        ]);
        setLoadingInitial(false);

        const { data, error: e } = pageRes;
        if (e) {
            setError(e.message);
            setRows([]);
            setTotals(null);
            setTotalsError(null);
            return;
        }

        if (totalsRes.error) {
            setTotals(null);
            setTotalsError(totalsRes.error.message);
        } else {
            setTotals(totalsRes.data);
            setTotalsError(null);
        }

        const list = (data as ProductoRow[]) ?? [];
        const more = list.length > PAGE_SIZE;
        const slice = more ? list.slice(0, PAGE_SIZE) : list;
        setRows(slice);
        setHasMore(more);
        if (more && slice.length > 0) {
            const last = slice[slice.length - 1]!;
            setNextCursor({ created_at: last.created_at, id: last.id });
        } else {
            setNextCursor(null);
        }
    }, [debouncedSearch, negocioId]);

    const refreshTotals = useCallback(async () => {
        const supabase = createClient();
        const search = debouncedSearch || undefined;
        const totalsRes = await fetchProductosTotalsForNegocio(supabase, negocioId, { search });
        if (totalsRes.error) {
            setTotals(null);
            setTotalsError(totalsRes.error.message);
        } else {
            setTotals(totalsRes.data);
            setTotalsError(null);
        }
    }, [debouncedSearch, negocioId]);

    const handleProductoSaved = useCallback(
        (
            productoId: string,
            patch: Pick<ProductoRow, "nombre" | "barcode" | "precio_compra" | "precio_venta" | "stock_actual" | "activo">,
        ) => {
            setRows((prev) => prev.map((r) => (r.id === productoId ? { ...r, ...patch } : r)));
            void refreshTotals();
        },
        [refreshTotals],
    );

    const loadMore = useCallback(async () => {
        if (!hasMore || loadingMore || !nextCursor) return;
        setLoadingMore(true);
        setError(null);
        const supabase = createClient();
        const { data, error: e } = await listProductosPage(supabase, negocioId, {
            limit: PAGE_SIZE,
            cursor: nextCursor,
            search: debouncedSearch || undefined,
        });
        setLoadingMore(false);
        if (e) {
            setError(e.message);
            return;
        }
        const list = (data as ProductoRow[]) ?? [];
        const more = list.length > PAGE_SIZE;
        const slice = more ? list.slice(0, PAGE_SIZE) : list;
        setRows((prev) => [...prev, ...slice]);
        setHasMore(more);
        if (more && slice.length > 0) {
            const last = slice[slice.length - 1]!;
            setNextCursor({ created_at: last.created_at, id: last.id });
        } else {
            setNextCursor(null);
        }
    }, [debouncedSearch, hasMore, loadingMore, negocioId, nextCursor]);

    useEffect(() => {
        void loadFirstPage();
    }, [loadFirstPage]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                const hit = entries.some((e) => e.isIntersecting);
                if (hit) void loadMore();
            },
            { root: null, rootMargin: "120px", threshold: 0 },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [loadMore]);

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        setError(null);
        const supabase = createClient();
        const precioCompra = parseRequiredMoney(nPc);
        const precioVenta = parseRequiredMoney(nPv);
        const stockInicial = parseRequiredStock(nStock);
        if (precioCompra === null || precioVenta === null || stockInicial === null) {
            setAdding(false);
            const msg = "Completá precio de compra, precio de venta y stock con números válidos (cada uno mayor o igual a 0).";
            setError(msg);
            toast.error("Faltan datos del producto", { description: msg });
            return;
        }
        const { data: insertado, error: insErr } = await insertProducto(supabase, {
            negocio_id: negocioId,
            nombre: nNombre,
            barcode: nBarcode || null,
            precio_compra: precioCompra,
            precio_venta: precioVenta,
            stock_actual: 0,
            activo: nActivo,
        });
        setAdding(false);
        if (insErr) {
            setError(insErr.message);
            toast.error("No se pudo añadir el producto", {
                description: insErr.message,
            });
            return;
        }
        if (insertado?.id && stockInicial > 0) {
            const { error: compErr } = await insertCompraReposicion(
                supabase,
                negocioId,
                [
                    {
                        producto_id: insertado.id,
                        cantidad: stockInicial,
                        precio_unitario: precioCompra,
                    },
                ],
                { notas: "Compra (stock inicial al crear producto)" },
            );
            if (compErr) {
                const desc = compErr instanceof Error ? compErr.message : String(compErr);
                toast.warning("Producto añadido, pero no se registró la compra / movimiento de stock", {
                    description: desc,
                });
            }
        }
        setNNombre("");
        setNBarcode("");
        setNPc("");
        setNPv("");
        setNStock("");
        setNActivo(true);
        setAddAccordionValue("");
        toast.success("Producto añadido");
        void loadFirstPage();
    };

    if (loadingInitial && rows.length === 0) {
        return (
            <div className='flex items-center gap-2 text-muted-foreground py-8'>
                <Loader2 className='h-5 w-5 animate-spin' />
                Cargando productos…
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-6'>
            {error ?
                <p className='text-sm text-destructive border border-destructive/30 rounded-md p-3'>{error}</p>
            :   null}

            <div>
                <h2 id='productos-tab-heading'>Productos</h2>
                <p className='mt-1 text-sm text-muted-foreground'>El catálogo de tu negocio.</p>
            </div>

            <div className='rounded-lg border bg-card'>
                <Accordion type='single' collapsible value={addAccordionValue} onValueChange={setAddAccordionValue}>
                    <AccordionItem value='add-producto' className='border-b-0'>
                        <AccordionTrigger className='px-4 py-3 hover:no-underline'>Añadir producto</AccordionTrigger>
                        <AccordionContent className='px-4 pb-4'>
                            <form onSubmit={add} className='flex flex-col gap-3'>
                                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='np-nombre'>Nombre *</Label>
                                        <Input
                                            id='np-nombre'
                                            value={nNombre}
                                            onChange={(e) => setNNombre(e.target.value)}
                                            required
                                            placeholder='Producto'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='np-bar'>Código barras</Label>
                                        <Input id='np-bar' value={nBarcode} onChange={(e) => setNBarcode(e.target.value)} />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='np-pc'>Precio compra *</Label>
                                        <Input
                                            id='np-pc'
                                            value={nPc}
                                            onChange={(e) => setNPc(sanitizeDecimalInput(e.target.value))}
                                            inputMode='decimal'
                                            pattern='[0-9.,]*'
                                            required
                                            placeholder='0'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='np-pv'>Precio venta *</Label>
                                        <Input
                                            id='np-pv'
                                            value={nPv}
                                            onChange={(e) => setNPv(sanitizeDecimalInput(e.target.value))}
                                            inputMode='decimal'
                                            pattern='[0-9.,]*'
                                            required
                                            placeholder='0'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='np-st'>Stock *</Label>
                                        <Input
                                            id='np-st'
                                            value={nStock}
                                            onChange={(e) => setNStock(sanitizeIntInput(e.target.value))}
                                            inputMode='numeric'
                                            pattern='[0-9]*'
                                            required
                                            placeholder='0'
                                        />
                                    </div>
                                    <div className='flex items-end gap-2 pb-2'>
                                        <Checkbox id='np-act' checked={nActivo} onCheckedChange={(v) => setNActivo(v === true)} />
                                        <Label htmlFor='np-act' className='font-normal'>
                                            Activo
                                        </Label>
                                    </div>
                                </div>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <Button type='submit' disabled={adding} className='w-fit'>
                                        {adding ?
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                        :   <Plus className='h-4 w-4' />}
                                        Añadir producto
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='icon'
                                        className='shrink-0'
                                        onClick={() => setScannerOpen(true)}
                                        aria-label='Escanear código de barras'>
                                        <Camera className='h-4 w-4' />
                                    </Button>
                                </div>
                            </form>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            <BarcodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={(text) => setNBarcode(text)} />

            <div className='grid gap-2'>
                <Label htmlFor='productos-buscar'>Buscar productos</Label>
                <Input
                    id='productos-buscar'
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder='Nombre o código de barras…'
                    autoComplete='off'
                />
            </div>

            <h2 className='text-sm font-medium lg:hidden'>Lista de productos</h2>

            <div className='rounded-lg border overflow-hidden flex flex-col max-h-[min(65vh,32rem)] bg-card'>
                <div className='overflow-x-auto overflow-y-auto min-h-0 flex-1'>
                    <table className='w-full table-fixed text-sm'>
                        <colgroup>
                            <col className='w-4/12' />
                            <col className='w-2/12' />
                            <col className='w-1/12' />
                            <col className='w-1/12' />
                            <col className='w-1/12' />
                            <col className='w-1/12' />
                            <col className='w-1/12' />
                            <col className='w-1/12' />
                        </colgroup>
                        <thead className='hidden md:table-header-group sticky top-0 z-10 bg-muted/95 backdrop-blur-sm border-b'>
                            <tr className='text-left'>
                                <th scope='col' className='p-2 font-medium'>
                                    Nombre
                                </th>
                                <th scope='col' className='p-2 font-medium'>
                                    Código barras
                                </th>
                                <th scope='col' className='p-2 font-medium'>
                                    P. compra
                                </th>
                                <th scope='col' className='p-2 font-medium'>
                                    P. venta
                                </th>
                                <th scope='col' className='p-2 font-medium'>
                                    Stock
                                </th>
                                <th scope='col' className='p-2 font-medium'>
                                    Activo
                                </th>
                                <th scope='col' className='p-2 font-medium'>
                                    Creado
                                </th>
                                <th scope='col' className='p-2 font-medium text-right'>
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ?
                                <tr>
                                    <td colSpan={8} className='p-6 text-center text-muted-foreground'>
                                        No hay productos. Usa el formulario de arriba para añadir el primero.
                                    </td>
                                </tr>
                            :   rows.map((row) => (
                                    <ProductoRowEditor
                                        key={row.id}
                                        row={row}
                                        onChanged={loadFirstPage}
                                        onSaved={(patch) => handleProductoSaved(row.id, patch)}
                                        isEditing={editingRowId === row.id}
                                        onStartEdit={() => setEditingRowId(row.id)}
                                        onDoneEdit={() => setEditingRowId(null)}
                                    />
                                ))
                            }
                        </tbody>
                    </table>
                </div>

                <div role='region' aria-label='Totales de productos' className='shrink-0 border-t bg-muted/50'>
                    {totalsError ?
                        <p className='px-3 py-2 text-xs text-destructive'>{totalsError}</p>
                    : totals ?
                        <div className='px-3 py-2.5'>
                            <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
                                <div className='flex items-center gap-2 min-w-0'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                                        Totales
                                        {debouncedSearch ?
                                            <span className='ml-1 font-normal normal-case'>(según búsqueda)</span>
                                        :   null}
                                    </p>
                                    {loadingInitial && rows.length > 0 ?
                                        <Loader2
                                            className='h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0'
                                            aria-label='Actualizando totales'
                                        />
                                    :   null}
                                </div>
                                <dl className='flex min-w-0 w-full flex-nowrap items-baseline gap-x-4 gap-y-0 overflow-x-auto text-xs tabular-nums sm:flex-wrap sm:gap-x-6 sm:gap-y-1'>
                                    <div className='shrink-0'>
                                        <dt className='text-muted-foreground'>Productos</dt>
                                        <dd className='font-medium text-foreground'>{totals.lineCount}</dd>
                                    </div>
                                    <div className='shrink-0'>
                                        <dt className='text-muted-foreground'>Stock</dt>
                                        <dd className='font-medium text-foreground'>{totals.stockTotal}</dd>
                                    </div>
                                    <div className='shrink-0'>
                                        <dt className='text-muted-foreground'>Total compra</dt>
                                        <dd className='font-medium text-foreground whitespace-nowrap'>
                                            {formatARS(totals.sumPrecioCompra)}
                                        </dd>
                                    </div>
                                    <div className='shrink-0'>
                                        <dt className='text-muted-foreground'>Total venta</dt>
                                        <dd className='font-medium text-foreground whitespace-nowrap'>
                                            {formatARS(totals.sumPrecioVenta)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    :   <div className='px-3 py-2 text-xs text-muted-foreground'>-</div>}
                </div>
            </div>

            <div ref={sentinelRef} className='h-1 w-full' aria-hidden />

            {loadingMore ?
                <div className='flex justify-center py-2 text-muted-foreground text-sm gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Cargando más…
                </div>
            :   null}
        </div>
    );
}
