"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Loader2, Minus, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { BarcodeScannerDialog } from "@/components/tienda/barcode-scanner-dialog";
import { CompraItemsPanel } from "@/components/tienda/compra-items-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { insertCompraReposicion, listComprasByNegocioPage } from "@/lib/queries/compras";
import type { CompraNegocioRow } from "@/lib/queries/compras";
import { insertProducto, listProductos } from "@/lib/queries/productos";
import { createClient } from "@/lib/supabase/client";
import { getCompraComprobanteSignedUrl, uploadCompraComprobante } from "@/lib/storage/compras-comprobantes";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ProductoRow } from "@/lib/types/negocio";
import type { KeysetCursor } from "@/lib/types/pagination";

type Props = { negocioId: string };

const COMPRAS_PAGE_SIZE = 10;

type LineaCompra = {
    producto: ProductoRow;
    qty: number;
    /** Precio unitario de compra (texto del input). */
    precioUnitStr: string;
};

function moneyARS(v: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(v);
}

function toNumber(v: string | number | null | undefined) {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function strMoney(v: string | number | null | undefined) {
    if (v === null || v === undefined) return "";
    return String(v);
}

function sanitizeDecimalInput(raw: string) {
    const only = raw.replace(/[^\d.,]/g, "");
    const firstSep = only.search(/[.,]/);
    if (firstSep === -1) return only;
    const intPart = only.slice(0, firstSep);
    const decPart = only
        .slice(firstSep + 1)
        .replace(/[.,]/g, "")
        .slice(0, 2);
    const sep = only[firstSep] ?? ".";
    return `${intPart}${sep}${decPart}`;
}

function sanitizeIntInput(raw: string) {
    return raw.replace(/[^\d]/g, "");
}

function parseRequiredMoney(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = parseFloat(t.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseManualCantidad(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
}

function formatFechaCorta(iso: string) {
    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(iso));
}

function BotonDescargarComprobante({
    compra,
    descargando,
    onDescargar,
}: {
    compra: CompraNegocioRow;
    descargando: boolean;
    onDescargar: (row: CompraNegocioRow) => void;
}) {
    if (!compra.comprobante_storage_path?.trim()) {
        return <span className='text-muted-foreground text-xs'>—</span>;
    }
    return (
        <Button
            type='button'
            variant='outline'
            size='sm'
            className='inline-flex items-center gap-1'
            disabled={descargando}
            onClick={() => void onDescargar(compra)}
            aria-label={`Descargar comprobante del ${formatFechaCorta(compra.created_at)}`}>
            {descargando ?
                <Loader2 className='h-3 w-3 animate-spin shrink-0' aria-hidden />
            :   <Download className='h-3 w-3 shrink-0' aria-hidden />}
            <span>Descargar</span>
        </Button>
    );
}

export function ComprasTab({ negocioId }: Props) {
    const [productos, setProductos] = useState<ProductoRow[]>([]);
    const [comprasRows, setComprasRows] = useState<CompraNegocioRow[]>([]);
    const [comprasNextCursor, setComprasNextCursor] = useState<KeysetCursor | null>(null);
    const [comprasHasMore, setComprasHasMore] = useState(false);
    const [comprasLoadingMore, setComprasLoadingMore] = useState(false);
    const comprasScrollRootRef = useRef<HTMLDivElement | null>(null);
    const comprasSentinelRef = useRef<HTMLDivElement | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [comprasListError, setComprasListError] = useState<string | null>(null);
    const [descargaCompraId, setDescargaCompraId] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [lineas, setLineas] = useState<LineaCompra[]>([]);

    const [proveedorNombre, setProveedorNombre] = useState("");
    const [proveedorRef, setProveedorRef] = useState("");
    const [proveedorCuitCuil, setProveedorCuitCuil] = useState("");
    const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

    const [guardando, setGuardando] = useState(false);

    const [manualNombre, setManualNombre] = useState("");
    const [manualBarcode, setManualBarcode] = useState("");
    const [manualPrecioCompra, setManualPrecioCompra] = useState("");
    const [manualPrecioVenta, setManualPrecioVenta] = useState("");
    const [manualCantidad, setManualCantidad] = useState("1");
    const [manualSaving, setManualSaving] = useState(false);

    const applyComprasPage = useCallback((raw: CompraNegocioRow[] | null, replace: boolean) => {
        const list = raw ?? [];
        const more = list.length > COMPRAS_PAGE_SIZE;
        const slice = more ? list.slice(0, COMPRAS_PAGE_SIZE) : list;
        if (replace) {
            setComprasRows(slice);
        } else {
            setComprasRows((prev) => [...prev, ...slice]);
        }
        setComprasHasMore(more);
        if (more && slice.length > 0) {
            const last = slice[slice.length - 1]!;
            setComprasNextCursor({ created_at: last.created_at, id: last.id });
        } else {
            setComprasNextCursor(null);
        }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        setComprasListError(null);
        setComprasLoadingMore(false);
        setComprasHasMore(false);
        setComprasNextCursor(null);
        const supabase = createClient();
        const [prodRes, compRes] = await Promise.all([
            listProductos(supabase, negocioId, { soloActivos: true }),
            listComprasByNegocioPage(supabase, negocioId, { limit: COMPRAS_PAGE_SIZE, cursor: null }),
        ]);
        setLoading(false);

        if (prodRes.error) {
            setError(prodRes.error.message);
            setProductos([]);
        } else {
            setProductos((prodRes.data as ProductoRow[]) ?? []);
        }

        if (compRes.error) {
            setComprasListError(compRes.error.message);
            setComprasRows([]);
            setComprasHasMore(false);
            setComprasNextCursor(null);
        } else {
            applyComprasPage(compRes.data as CompraNegocioRow[] | null, true);
        }
    }, [applyComprasPage, negocioId]);

    const loadMoreCompras = useCallback(async () => {
        if (!comprasHasMore || comprasLoadingMore || !comprasNextCursor) return;
        setComprasLoadingMore(true);
        setComprasListError(null);
        const supabase = createClient();
        const { data, error: compErr } = await listComprasByNegocioPage(supabase, negocioId, {
            limit: COMPRAS_PAGE_SIZE,
            cursor: comprasNextCursor,
        });
        setComprasLoadingMore(false);
        if (compErr) {
            setComprasListError(compErr.message);
            return;
        }
        applyComprasPage((data as CompraNegocioRow[] | null) ?? [], false);
    }, [applyComprasPage, comprasHasMore, comprasLoadingMore, comprasNextCursor, negocioId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const root = comprasScrollRootRef.current;
        const target = comprasSentinelRef.current;
        if (!root || !target || !comprasHasMore || comprasRows.length === 0) return;
        const obs = new IntersectionObserver(
            (entries) => {
                const hit = entries.some((e) => e.isIntersecting);
                if (hit) void loadMoreCompras();
            },
            { root, rootMargin: "80px", threshold: 0 },
        );
        obs.observe(target);
        return () => obs.disconnect();
    }, [comprasHasMore, comprasRows.length, loadMoreCompras]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        const out: ProductoRow[] = [];
        for (const p of productos) {
            if (!p.activo) continue;
            const nombre = p.nombre.toLowerCase();
            const bc = (p.barcode ?? "").toLowerCase();
            if (nombre.includes(q) || bc.includes(q)) out.push(p);
            if (out.length >= 8) break;
        }
        return out;
    }, [productos, query]);

    const addProducto = useCallback((p: ProductoRow, qty = 1) => {
        const unit = strMoney(p.precio_compra);
        setLineas((prev) => {
            const idx = prev.findIndex((it) => it.producto.id === p.id);
            if (idx === -1) return [...prev, { producto: p, qty, precioUnitStr: unit || "0" }];
            const copy = prev.slice();
            copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
            return copy;
        });
    }, []);

    const agregarProductoManual = async () => {
        const nombre = manualNombre.trim();
        if (!nombre) {
            toast.error("Completá el nombre del producto.");
            return;
        }
        const pc = parseRequiredMoney(manualPrecioCompra);
        if (pc === null) {
            toast.error("Completá el precio de compra unitario.");
            return;
        }
        const pvInput = parseRequiredMoney(manualPrecioVenta);
        const pv = pvInput ?? pc;
        const cant = parseManualCantidad(manualCantidad);
        if (cant === null) {
            toast.error("La cantidad tiene que ser un número entero mayor o igual a 1.");
            return;
        }

        setManualSaving(true);
        const supabase = createClient();
        const { data: insertado, error: insErr } = await insertProducto(supabase, {
            negocio_id: negocioId,
            nombre,
            barcode: manualBarcode.trim() || null,
            precio_compra: pc,
            precio_venta: pv,
            stock_actual: 0,
            activo: true,
        });
        setManualSaving(false);

        if (insErr) {
            toast.error("No se pudo crear el producto", { description: insErr.message });
            return;
        }
        if (!insertado) {
            toast.error("No se pudo crear el producto.");
            return;
        }

        const row = insertado as ProductoRow;
        setProductos((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [...prev, row];
        });
        addProducto(row, cant);
        setManualNombre("");
        setManualBarcode("");
        setManualPrecioCompra("");
        setManualPrecioVenta("");
        setManualCantidad("1");
        toast.success("Producto creado y añadido a la compra");
    };

    const addByBarcode = useCallback(
        (barcode: string) => {
            const code = barcode.trim();
            const p = productos.find((x) => x.activo && (x.barcode ?? "").trim() === code);
            if (!p) {
                toast.error("Producto no encontrado", { description: `Código: ${code}` });
                return;
            }
            addProducto(p, 1);
            toast.success("Producto añadido");
        },
        [addProducto, productos],
    );

    const totalCompra = useMemo(() => {
        return lineas.reduce((acc, it) => acc + toNumber(it.precioUnitStr) * it.qty, 0);
    }, [lineas]);

    const registrar = async () => {
        const pn = proveedorNombre.trim();
        const pr = proveedorRef.trim();
        const pc = proveedorCuitCuil.trim();
        if (!pn) {
            toast.error("Completá el nombre del proveedor.");
            return;
        }
        if (!pr && !pc) {
            toast.error("Completá la referencia de factura/remito o el CUIT/CUIL del proveedor.");
            return;
        }
        if (lineas.length === 0) {
            toast.error("Agregá al menos un producto a la compra.");
            return;
        }

        const linesPayload: { producto_id: string; cantidad: number; precio_unitario: number }[] = [];
        for (const it of lineas) {
            const cant = Math.trunc(it.qty);
            const pu = toNumber(it.precioUnitStr);
            if (!Number.isFinite(pu) || pu < 0) {
                toast.error("Revisá los precios unitarios de compra.", {
                    description: it.producto.nombre,
                });
                return;
            }
            if (!Number.isFinite(cant) || cant < 1) {
                toast.error("Revisá las cantidades.", { description: it.producto.nombre });
                return;
            }
            linesPayload.push({ producto_id: it.producto.id, cantidad: cant, precio_unitario: pu });
        }

        setGuardando(true);
        const supabase = createClient();
        try {
            let comprobantePath: string | null = null;
            if (comprobanteFile) {
                const { storagePath, error: upErr } = await uploadCompraComprobante(supabase, negocioId, comprobanteFile);
                if (upErr) {
                    toast.error("No se pudo subir el comprobante", { description: upErr.message });
                    setGuardando(false);
                    return;
                }
                comprobantePath = storagePath;
            }

            const { data: auth } = await supabase.auth.getUser();

            const { error: insErr } = await insertCompraReposicion(supabase, negocioId, linesPayload, {
                notas: "Compra registrada desde la tienda",
                usuario_id: auth.user?.id ?? null,
                proveedor_nombre: pn,
                proveedor_ref: pr || null,
                proveedor_cuit_cuil: pc || null,
                comprobante_storage_path: comprobantePath,
            });

            if (insErr) {
                const msg = insErr instanceof Error ? insErr.message : String(insErr);
                toast.error("No se pudo registrar la compra", { description: msg });
                setGuardando(false);
                return;
            }

            toast.success("Compra registrada");
            setLineas([]);
            setQuery("");
            setProveedorNombre("");
            setProveedorRef("");
            setProveedorCuitCuil("");
            setComprobanteFile(null);
            void load();
        } finally {
            setGuardando(false);
        }
    };

    const descargarComprobante = async (row: CompraNegocioRow) => {
        const path = row.comprobante_storage_path?.trim();
        if (!path) return;
        setDescargaCompraId(row.id);
        const supabase = createClient();
        const { signedUrl, error: signErr } = await getCompraComprobanteSignedUrl(supabase, path);
        setDescargaCompraId(null);
        if (signErr || !signedUrl) {
            toast.error("No se pudo generar el enlace de descarga", {
                description: signErr?.message ?? "Intentá de nuevo.",
            });
            return;
        }
        window.open(signedUrl, "_blank", "noopener,noreferrer");
    };

    if (loading && productos.length === 0 && comprasRows.length === 0) {
        return (
            <div className='flex items-center gap-2 text-muted-foreground py-8'>
                <Loader2 className='h-5 w-5 animate-spin' aria-hidden />
                <span className='text-sm'>Cargando productos…</span>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-6'>
            {error ?
                <p className='text-sm text-destructive border border-destructive/30 rounded-md p-3'>{error}</p>
            :   null}

            <div>
                <h2 id='compras-tab-heading'>Compras</h2>
                <p className='mt-1 text-sm text-muted-foreground'>
                    Registrá compras a proveedor, cargá el comprobante si querés y actualizá el stock desde las líneas.
                </p>
            </div>

            <section className='rounded-lg border bg-card overflow-hidden' aria-labelledby='mis-compras-heading'>
                <div className='border-b bg-muted/50 px-4 py-3'>
                    <h3 id='mis-compras-heading' className='text-sm font-medium text-foreground'>
                        Mis compras
                    </h3>
                    <p className='mt-1 text-xs text-muted-foreground'>
                        Abrí cada compra para ver los productos, notas y descargar el comprobante si lo subiste.
                    </p>
                </div>
                {comprasListError ?
                    <p className='text-sm text-destructive p-4'>{comprasListError}</p>
                : comprasRows.length === 0 ?
                    <p className='text-sm text-muted-foreground p-6 text-center'>Todavía no hay compras registradas.</p>
                :   <div ref={comprasScrollRootRef} className='max-h-[min(50vh,24rem)] overflow-y-auto overflow-x-hidden'>
                        <Accordion type='single' collapsible className='w-full'>
                            {comprasRows.map((c) => {
                                const date = new Date(c.created_at);
                                const fechaCorta = date.toLocaleDateString("es-AR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                });
                                const hora = date.toLocaleTimeString("es-FR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                });
                                const totalStr = moneyARS(toNumber(c.total));
                                const proveedor = c.proveedor_nombre?.trim() || "Sin proveedor";
                                const refTxt = c.proveedor_ref?.trim();
                                const cuitTxt = c.proveedor_cuit_cuil?.trim();
                                const linePartsSinCuit = [hora, proveedor, refTxt ? `Ref. ${refTxt}` : null].filter(
                                    (p): p is string => Boolean(p),
                                );
                                const lineaMetaSinCuit = linePartsSinCuit.join(" · ");
                                const lineaMetaCompleta =
                                    cuitTxt ? `${lineaMetaSinCuit} · ${cuitTxt}` : lineaMetaSinCuit;

                                return (
                                    <AccordionItem key={c.id} value={`compra-${c.id}`}>
                                        <AccordionTrigger
                                            className='px-4 py-3 hover:no-underline [&>svg]:shrink-0'
                                            aria-label={`Compra ${fechaCorta} ${proveedor} · ${totalStr}`}>
                                            <div className='min-w-0 flex-1 pr-2 text-left'>
                                                <div className='flex items-center justify-between gap-3'>
                                                    <div className='min-w-0'>
                                                        <div className='truncate font-medium'>{fechaCorta}</div>
                                                        {cuitTxt ?
                                                            <>
                                                                <div className='space-y-0.5 sm:hidden'>
                                                                    <div className='truncate text-xs text-muted-foreground'>
                                                                        {lineaMetaSinCuit}
                                                                    </div>
                                                                    <div className='truncate text-xs text-muted-foreground tabular-nums'>
                                                                        {cuitTxt}
                                                                    </div>
                                                                </div>
                                                                <div className='hidden truncate text-xs text-muted-foreground sm:block'>
                                                                    {lineaMetaCompleta}
                                                                </div>
                                                            </>
                                                        :   <div className='truncate text-xs text-muted-foreground'>
                                                                {lineaMetaSinCuit}
                                                            </div>}
                                                    </div>
                                                    <div className='shrink-0 text-right'>
                                                        <div className='font-semibold tabular-nums'>{totalStr}</div>
                                                        <div className='text-xs text-muted-foreground'>Ver productos</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className='px-4'>
                                            <div className='app-accordion-detail-compra space-y-4'>
                                                <CompraItemsPanel compraId={c.id} />
                                                <div className='space-y-3 border-t border-border/60 pt-3 text-sm'>
                                                    {c.notas?.trim() ?
                                                        <div className='grid gap-1'>
                                                            <span className='text-xs text-muted-foreground'>Notas</span>
                                                            <p className='break-words text-xs leading-snug'>{c.notas}</p>
                                                        </div>
                                                    :   null}
                                                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                                        <span className='text-xs text-muted-foreground'>Comprobante</span>
                                                        <BotonDescargarComprobante
                                                            compra={c}
                                                            descargando={descargaCompraId === c.id}
                                                            onDescargar={descargarComprobante}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                        {comprasLoadingMore ?
                            <div className='flex justify-center gap-2 border-t border-border/60 py-2 text-xs text-muted-foreground'>
                                <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin' aria-hidden />
                                Cargando más compras…
                            </div>
                        :   null}
                        {comprasHasMore ?
                            <div ref={comprasSentinelRef} className='h-1 w-full shrink-0' aria-hidden />
                        :   null}
                    </div>
                }
            </section>

            <Accordion type='single' collapsible className='rounded-lg border bg-card px-4'>
                <AccordionItem value='nueva-compra' className='border-0'>
                    <AccordionTrigger className='hover:no-underline py-3 text-sm font-medium'>Registrar nueva compra</AccordionTrigger>
                    <AccordionContent className='space-y-6'>
                        <section className='rounded-lg border bg-muted/20 p-4 flex flex-col gap-4'>
                            <div>
                                <h2 className='text-sm font-medium'>Proveedor</h2>
                                <p className='text-xs text-muted-foreground mt-1'>
                                    Nombre obligatorio. Además, completá al menos el nº de factura/remito o el CUIT/CUIL.
                                </p>
                            </div>
                            <div className='grid gap-3 sm:grid-cols-2'>
                                <div className='grid gap-1'>
                                    <Label htmlFor='compra-prov-nombre'>Nombre del proveedor *</Label>
                                    <Input
                                        id='compra-prov-nombre'
                                        value={proveedorNombre}
                                        onChange={(e) => setProveedorNombre(e.target.value)}
                                        autoComplete='organization'
                                        required
                                    />
                                </div>
                                <div className='grid gap-1'>
                                    <Label htmlFor='compra-prov-ref'>Nº factura / remito / ref.</Label>
                                    <Input
                                        id='compra-prov-ref'
                                        value={proveedorRef}
                                        onChange={(e) => setProveedorRef(e.target.value)}
                                        placeholder='Opcional si cargás CUIT/CUIL'
                                    />
                                </div>
                                <div className='grid gap-1 sm:col-span-2'>
                                    <Label htmlFor='compra-prov-cuit'>CUIT / CUIL</Label>
                                    <Input
                                        id='compra-prov-cuit'
                                        value={proveedorCuitCuil}
                                        onChange={(e) => setProveedorCuitCuil(e.target.value)}
                                        placeholder='Opcional si cargás referencia de factura'
                                    />
                                </div>
                            </div>

                            <div className='grid gap-2'>
                                <Label htmlFor='compra-comprobante'>Comprobante (foto o PDF)</Label>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <Input
                                        id='compra-comprobante'
                                        type='file'
                                        accept='image/jpeg,image/png,image/webp,application/pdf'
                                        className='max-w-md cursor-pointer'
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            setComprobanteFile(f ?? null);
                                        }}
                                    />
                                    {comprobanteFile ?
                                        <Button type='button' variant='ghost' size='sm' onClick={() => setComprobanteFile(null)}>
                                            Quitar archivo
                                        </Button>
                                    :   null}
                                </div>
                                {comprobanteFile ?
                                    <p className='text-xs text-muted-foreground flex items-center gap-1'>
                                        <Upload className='h-3 w-3 shrink-0' aria-hidden />
                                        {comprobanteFile.name}
                                    </p>
                                :   <p className='text-xs text-muted-foreground'>Opcional. Segurizado. Máximo 50 MB por archivo.</p>}
                            </div>
                        </section>

                        <section className='rounded-lg border bg-card p-4 flex flex-col gap-3'>
                            <div className='flex items-start justify-between gap-3'>
                                <div>
                                    <h2 className='text-sm font-medium'>Productos</h2>
                                    <p className='text-xs text-muted-foreground mt-1'>
                                        Buscá por nombre o código, escaneá con la cámara y ajustá el precio de compra unitario.
                                    </p>
                                </div>
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

                            <div className='rounded-md border border-dashed border-muted-foreground/25 bg-muted/20 p-3 grid gap-3'>
                                <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                                    <div className='grid gap-1 sm:col-span-2 lg:col-span-1'>
                                        <Label htmlFor='compra-manual-nombre'>Nombre *</Label>
                                        <Input
                                            id='compra-manual-nombre'
                                            value={manualNombre}
                                            onChange={(e) => setManualNombre(e.target.value)}
                                            placeholder='Ej. Yerba nueva'
                                            autoComplete='off'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='compra-manual-bar'>Código de barras</Label>
                                        <Input
                                            id='compra-manual-bar'
                                            value={manualBarcode}
                                            onChange={(e) => setManualBarcode(e.target.value)}
                                            autoComplete='off'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='compra-manual-pc'>Precio compra unit. *</Label>
                                        <Input
                                            id='compra-manual-pc'
                                            value={manualPrecioCompra}
                                            onChange={(e) => setManualPrecioCompra(sanitizeDecimalInput(e.target.value))}
                                            inputMode='decimal'
                                            placeholder='0'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='compra-manual-pv'>Precio venta</Label>
                                        <Input
                                            id='compra-manual-pv'
                                            value={manualPrecioVenta}
                                            onChange={(e) => setManualPrecioVenta(sanitizeDecimalInput(e.target.value))}
                                            inputMode='decimal'
                                            placeholder='Igual que compra si lo dejás vacío'
                                        />
                                    </div>
                                    <div className='grid gap-1'>
                                        <Label htmlFor='compra-manual-qty'>Cantidad *</Label>
                                        <Input
                                            id='compra-manual-qty'
                                            value={manualCantidad}
                                            onChange={(e) => setManualCantidad(sanitizeIntInput(e.target.value))}
                                            inputMode='numeric'
                                            placeholder='1'
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Button
                                        type='button'
                                        variant='secondary'
                                        disabled={manualSaving}
                                        className='inline-flex items-center gap-2'
                                        onClick={() => void agregarProductoManual()}>
                                        {manualSaving ?
                                            <>
                                                <Loader2 className='h-4 w-4 animate-spin shrink-0' aria-hidden />
                                                Creando…
                                            </>
                                        :   "Agregar producto manual"}
                                    </Button>
                                </div>
                            </div>

                            <div className='relative'>
                                <div className='flex gap-2'>
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder='Nombre o código de barras…'
                                        autoComplete='off'
                                    />
                                    <Button
                                        type='button'
                                        variant='secondary'
                                        onClick={() => {
                                            const q = query.trim();
                                            if (!q) return;
                                            const exactBarcode = productos.find((p) => p.activo && (p.barcode ?? "").trim() === q);
                                            if (exactBarcode) {
                                                addProducto(exactBarcode, 1);
                                                toast.success("Producto añadido");
                                                setQuery("");
                                                return;
                                            }
                                            if (filtered[0]) {
                                                addProducto(filtered[0], 1);
                                                toast.success("Producto añadido");
                                                setQuery("");
                                                return;
                                            }
                                            toast.error("Producto no encontrado");
                                        }}>
                                        Validar
                                    </Button>
                                </div>

                                {filtered.length > 0 ?
                                    <div className='absolute z-10 mt-2 w-full rounded-md border bg-popover shadow'>
                                        {filtered.map((p) => (
                                            <button
                                                key={p.id}
                                                type='button'
                                                className='w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between gap-3'
                                                onClick={() => {
                                                    addProducto(p, 1);
                                                    toast.success("Producto añadido");
                                                    setQuery("");
                                                }}>
                                                <span className='truncate'>{p.nombre}</span>
                                                <span className='text-muted-foreground shrink-0 text-xs'>
                                                    Compra {moneyARS(toNumber(p.precio_compra))}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                :   null}
                            </div>
                        </section>

                        <section className='rounded-lg border overflow-hidden bg-card'>
                            <div className='border-b bg-muted/50 px-4 py-2'>
                                <h3 className='text-sm font-medium'>Líneas de compra</h3>
                            </div>

                            {lineas.length === 0 ?
                                <div className='p-6 text-center text-muted-foreground text-sm'>Todavía no agregaste productos.</div>
                            :   <div className='divide-y'>
                                    {lineas.map((it) => {
                                        const unit = toNumber(it.precioUnitStr);
                                        const sub = unit * it.qty;
                                        return (
                                            <div key={it.producto.id} className='p-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4'>
                                                <div className='min-w-0 flex-1'>
                                                    <p className='font-medium truncate'>{it.producto.nombre}</p>
                                                    <p className='text-xs text-muted-foreground'>Precio unitario de compra</p>
                                                    <Input
                                                        className='mt-1 h-9 max-w-[10rem]'
                                                        value={it.precioUnitStr}
                                                        onChange={(e) => {
                                                            const v = sanitizeDecimalInput(e.target.value);
                                                            setLineas((prev) =>
                                                                prev.map((x) =>
                                                                    x.producto.id === it.producto.id ? { ...x, precioUnitStr: v } : x,
                                                                ),
                                                            );
                                                        }}
                                                        inputMode='decimal'
                                                    />
                                                </div>

                                                <div className='flex items-center gap-2'>
                                                    <Button
                                                        type='button'
                                                        size='icon'
                                                        variant='outline'
                                                        className='h-8 w-8'
                                                        onClick={() =>
                                                            setLineas((prev) =>
                                                                prev
                                                                    .map((x) =>
                                                                        x.producto.id === it.producto.id ?
                                                                            { ...x, qty: Math.max(1, x.qty - 1) }
                                                                        :   x,
                                                                    )
                                                                    .filter((x) => x.qty > 0),
                                                            )
                                                        }
                                                        aria-label='Restar'>
                                                        <Minus className='h-4 w-4' />
                                                    </Button>
                                                    <span className='w-8 text-center text-sm tabular-nums'>{it.qty}</span>
                                                    <Button
                                                        type='button'
                                                        size='icon'
                                                        variant='outline'
                                                        className='h-8 w-8'
                                                        onClick={() =>
                                                            setLineas((prev) =>
                                                                prev.map((x) =>
                                                                    x.producto.id === it.producto.id ? { ...x, qty: x.qty + 1 } : x,
                                                                ),
                                                            )
                                                        }
                                                        aria-label='Sumar'>
                                                        <Plus className='h-4 w-4' />
                                                    </Button>
                                                </div>

                                                <div className='flex items-center justify-between gap-3 sm:flex-col sm:items-end'>
                                                    <p className='text-sm font-medium tabular-nums'>{moneyARS(sub)}</p>
                                                    <Button
                                                        type='button'
                                                        size='icon'
                                                        variant='ghost'
                                                        className='h-8 w-8'
                                                        onClick={() =>
                                                            setLineas((prev) => prev.filter((x) => x.producto.id !== it.producto.id))
                                                        }
                                                        aria-label='Quitar'>
                                                        <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            }

                            <div className='border-t px-4 py-3 flex items-center justify-between'>
                                <span className='text-sm font-medium'>Total</span>
                                <span className='text-sm font-semibold tabular-nums'>{moneyARS(totalCompra)}</span>
                            </div>
                        </section>

                        <div className='flex justify-end'>
                            <Button type='button' disabled={guardando} onClick={() => void registrar()}>
                                {guardando ?
                                    <>
                                        <Loader2 className='h-4 w-4 animate-spin mr-2' aria-hidden />
                                        Guardando…
                                    </>
                                :   "Registrar compra"}
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <BarcodeScannerDialog
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onDetected={addByBarcode}
                closeOnDetected={false}
            />
        </div>
    );
}
