"use client";

import { createClient } from "@/lib/supabase/client";
import { deleteProducto, insertProducto, listProductos, updateProducto } from "@/lib/queries/productos";
import type { ProductoRow } from "@/lib/types/negocio";
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

function ProductoRowEditor({
    row,
    onChanged,
    isEditing,
    onStartEdit,
    onDoneEdit,
}: {
    row: ProductoRow;
    onChanged: () => void;
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
    const saveTimerRef = useRef<number | null>(null);
    const lastSavedKeyRef = useRef<string>("");

    useEffect(() => {
        setNombre(row.nombre);
        setBarcode(row.barcode ?? "");
        setPrecioCompra(strMoney(row.precio_compra));
        setPrecioVenta(strMoney(row.precio_venta));
        setStock(String(row.stock_actual));
        setActivo(row.activo);
        setMsg(null);
        lastSavedKeyRef.current = "";
    }, [row]);

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

        // Avoid pointless writes while user is still typing.
        if (!patch.nombre) return false;

        const key = JSON.stringify(patch);
        if (key === lastSavedKeyRef.current) return true;

        setSaving(true);
        setMsg(null);
        const supabase = createClient();
        const { error } = await updateProducto(supabase, row.id, patch);
        setSaving(false);
        if (error) {
            setMsg(error.message);
            toast.error("No se pudo guardar el producto", {
                description: error.message,
            });
            return false;
        }
        lastSavedKeyRef.current = key;
        if (opts?.notifySuccess) toast.success("Producto guardado");
        onChanged();
        return true;
    },
        [activo, barcode, nombre, onChanged, precioCompra, precioVenta, row.id, stock],
    );

    useEffect(() => {
        if (deleting) return;
        if (!isEditing) return;
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

        saveTimerRef.current = window.setTimeout(() => {
            guardar();
        }, 650);

        return () => {
            if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        };
    }, [guardar, deleting, isEditing]);

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
                                        {isEditing ? (
                                            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className='h-9 text-sm' />
                                        ) : (
                                            <p className='text-sm'>{barcode || "—"}</p>
                                        )}
                                    </div>

                                    <div className='grid grid-cols-3 gap-3'>
                                        <div className='grid gap-1'>
                                            <p className='text-xs text-muted-foreground'>Compra</p>
                                            {isEditing ? (
                                            <Input
                                                value={precioCompra}
                                                onChange={(e) => setPrecioCompra(sanitizeDecimalInput(e.target.value))}
                                                className='h-9 text-sm'
                                                inputMode='decimal'
                                                pattern='[0-9.,]*'
                                            />
                                            ) : (
                                                <p className='text-sm'>{precioCompra || "—"}</p>
                                            )}
                                        </div>
                                        <div className='grid gap-1'>
                                            <p className='text-xs text-muted-foreground'>Venta</p>
                                            {isEditing ? (
                                            <Input
                                                value={precioVenta}
                                                onChange={(e) => setPrecioVenta(sanitizeDecimalInput(e.target.value))}
                                                className='h-9 text-sm'
                                                inputMode='decimal'
                                                pattern='[0-9.,]*'
                                            />
                                            ) : (
                                                <p className='text-sm'>{precioVenta || "—"}</p>
                                            )}
                                        </div>
                                        <div className='grid gap-1'>
                                            <p className='text-xs text-muted-foreground'>Stock</p>
                                            {isEditing ? (
                                            <Input
                                                value={stock}
                                                onChange={(e) => setStock(sanitizeIntInput(e.target.value))}
                                                className='h-9 text-sm'
                                                inputMode='numeric'
                                                pattern='[0-9]*'
                                            />
                                            ) : (
                                                <p className='text-sm'>{stock || "0"}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className='flex items-center justify-between gap-3'>
                                        <div className='flex items-center gap-2'>
                                            <Checkbox checked={activo} onCheckedChange={(v) => setActivo(v === true)} id={`act-m-${row.id}`} disabled={!isEditing} />
                                            <Label htmlFor={`act-m-${row.id}`} className='text-sm font-normal'>
                                                Activo
                                            </Label>
                                        </div>
                                        <p className='text-sm text-muted-foreground whitespace-nowrap'>{formatCreatedAtShort(row.created_at)}</p>
                                    </div>

                                    <div className='flex items-center justify-end gap-2'>{actions}</div>

                                    {msg ? <p className='text-caption text-destructive mt-1'>{msg}</p> : null}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </td>
            </tr>

            {/* Desktop: single line per product */}
            <tr className='hidden sm:table-row border-b align-middle'>
                <td className='p-2'>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className='h-8 text-sm' readOnly={!isEditing} />
                </td>
                <td className='p-2'>
                    <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className='h-8 text-sm' readOnly={!isEditing} />
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

export function ProductosTab({ negocioId }: Props) {
    const [rows, setRows] = useState<ProductoRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [addAccordionValue, setAddAccordionValue] = useState<string>("");
    const [nNombre, setNNombre] = useState("");
    const [nBarcode, setNBarcode] = useState("");
    const [nPc, setNPc] = useState("0");
    const [nPv, setNPv] = useState("0");
    const [nStock, setNStock] = useState("0");
    const [nActivo, setNActivo] = useState(true);
    const [adding, setAdding] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const supabase = createClient();
        const { data, error: e } = await listProductos(supabase, negocioId);
        setLoading(false);
        if (e) {
            setError(e.message);
            return;
        }
        setRows((data as ProductoRow[]) ?? []);
    }, [negocioId]);

    useEffect(() => {
        load();
    }, [load]);

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        setError(null);
        const supabase = createClient();
        const { error: insErr } = await insertProducto(supabase, {
            negocio_id: negocioId,
            nombre: nNombre,
            barcode: nBarcode || null,
            precio_compra: parseMoney(nPc),
            precio_venta: parseMoney(nPv),
            stock_actual: parseStock(nStock),
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
        setNNombre("");
        setNBarcode("");
        setNPc("0");
        setNPv("0");
        setNStock("0");
        setNActivo(true);
        setAddAccordionValue("");
        toast.success("Producto añadido");
        load();
    };

    if (loading && rows.length === 0) {
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
                                        <Label htmlFor='np-pc'>Precio compra</Label>
                                        <Input
                                            id='np-pc'
                                            value={nPc}
                                            onChange={(e) => setNPc(sanitizeDecimalInput(e.target.value))}
                                            inputMode='decimal'
                                            pattern='[0-9.,]*'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='np-pv'>Precio venta</Label>
                                        <Input
                                            id='np-pv'
                                            value={nPv}
                                            onChange={(e) => setNPv(sanitizeDecimalInput(e.target.value))}
                                            inputMode='decimal'
                                            pattern='[0-9.,]*'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='np-st'>Stock</Label>
                                        <Input
                                            id='np-st'
                                            value={nStock}
                                            onChange={(e) => setNStock(sanitizeIntInput(e.target.value))}
                                            inputMode='numeric'
                                            pattern='[0-9]*'
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
                                        className='md:hidden shrink-0'
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

            <h2 className='text-sm font-medium lg:hidden'>Lista de productos</h2>

            <div className='rounded-lg border overflow-hidden'>
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
                    <thead className='hidden md:table-header-group'>
                        <tr className='border-b bg-muted/50 text-left'>
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
                                    onChanged={load}
                                    isEditing={editingRowId === row.id}
                                    onStartEdit={() => setEditingRowId(row.id)}
                                    onDoneEdit={() => setEditingRowId(null)}
                                />
                            ))
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
}
