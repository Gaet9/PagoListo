"use client";

import { createClient } from "@/lib/supabase/client";
import { listMovimientosStockPage, MOVIMIENTOS_STOCK_PAGE_SIZE } from "@/lib/queries/movimientos-stock";
import { listProductos } from "@/lib/queries/productos";
import { operacionMovimientoStock } from "@/lib/movimientos-stock-display";
import type { MovimientoStockRow, ProductoRow } from "@/lib/types/negocio";
import type { KeysetCursor } from "@/lib/types/pagination";
import { MovimientosStockAreaChart } from "@/components/tienda/movimientos-stock-area-chart";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

function nombreProducto(m: MovimientoStockRow) {
    const p = m.productos as unknown;
    if (p && typeof p === "object" && !Array.isArray(p) && "nombre" in p) {
        return String((p as { nombre: string }).nombre);
    }
    if (Array.isArray(p) && p[0] && typeof p[0] === "object" && "nombre" in p[0]) {
        return String((p[0] as { nombre: string }).nombre);
    }
    return "—";
}

function formatFecha(iso: string) {
    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
    }).format(new Date(iso));
}

function toPrecioNum(v: string | number | null | undefined) {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function formatARS(n: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(n);
}

function refOperacion(m: MovimientoStockRow) {
    const id = m.venta_id ?? m.compra_id;
    if (!id) return "—";
    return id.length > 10 ? `${id.slice(0, 10)}…` : id;
}

function stockEvolucion(m: MovimientoStockRow) {
    if (m.stock_anterior == null && m.stock_nuevo == null) {
        return "—";
    }
    return `${m.stock_anterior ?? "—"} → ${m.stock_nuevo ?? "—"}`;
}

/** `true` desde `md` (768px): tabla con cabecera; `false`: filas en acordeón. */
function useViewportIsMdUp() {
    const [isMdUp, setIsMdUp] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.matchMedia("(min-width: 768px)").matches;
    });
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        const apply = () => setIsMdUp(mq.matches);
        apply();
        mq.addEventListener("change", apply);
        return () => mq.removeEventListener("change", apply);
    }, []);
    return isMdUp;
}

type Props = { negocioId: string };

export function MovimientosTab({ negocioId }: Props) {
    const [rows, setRows] = useState<MovimientoStockRow[]>([]);
    const [nextCursor, setNextCursor] = useState<KeysetCursor | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const [productoFiltroId, setProductoFiltroId] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [searchDebounced, setSearchDebounced] = useState("");
    const [productosOpts, setProductosOpts] = useState<ProductoRow[]>([]);

    const pageSize = MOVIMIENTOS_STOCK_PAGE_SIZE;

    useEffect(() => {
        const t = window.setTimeout(() => {
            setSearchDebounced(searchInput.trim());
        }, 350);
        return () => window.clearTimeout(t);
    }, [searchInput]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const supabase = createClient();
            const { data, error: e } = await listProductos(supabase, negocioId);
            if (cancelled) return;
            if (!e) setProductosOpts((data as ProductoRow[]) ?? []);
        })();
        return () => {
            cancelled = true;
        };
    }, [negocioId]);

    const listOpts = useCallback(
        () => ({
            productoId: productoFiltroId,
            search: productoFiltroId ? null : searchDebounced || null,
        }),
        [productoFiltroId, searchDebounced],
    );

    const loadFirstPage = useCallback(async () => {
        setLoadingInitial(true);
        setError(null);
        setHasMore(true);
        setNextCursor(null);
        const supabase = createClient();
        const extra = listOpts();
        const { data, error: e } = await listMovimientosStockPage(supabase, negocioId, {
            limit: pageSize,
            cursor: null,
            ...extra,
        });
        setLoadingInitial(false);
        if (e) {
            setError(e.message);
            setRows([]);
            return;
        }
        const list = (data as MovimientoStockRow[]) ?? [];
        const more = list.length > pageSize;
        const slice = more ? list.slice(0, pageSize) : list;
        setRows(slice);
        setHasMore(more);
        if (more && slice.length > 0) {
            const last = slice[slice.length - 1]!;
            setNextCursor({ created_at: last.created_at, id: last.id });
        } else {
            setNextCursor(null);
        }
    }, [negocioId, pageSize, listOpts]);

    const loadMore = useCallback(async () => {
        if (!hasMore || loadingMore || !nextCursor) return;
        setLoadingMore(true);
        setError(null);
        const supabase = createClient();
        const extra = listOpts();
        const { data, error: e } = await listMovimientosStockPage(supabase, negocioId, {
            limit: pageSize,
            cursor: nextCursor,
            ...extra,
        });
        setLoadingMore(false);
        if (e) {
            setError(e.message);
            return;
        }
        const list = (data as MovimientoStockRow[]) ?? [];
        const more = list.length > pageSize;
        const slice = more ? list.slice(0, pageSize) : list;
        setRows((prev) => [...prev, ...slice]);
        setHasMore(more);
        if (more && slice.length > 0) {
            const last = slice[slice.length - 1]!;
            setNextCursor({ created_at: last.created_at, id: last.id });
        } else {
            setNextCursor(null);
        }
    }, [hasMore, loadingMore, negocioId, nextCursor, pageSize, listOpts]);

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

    const chartProductOptions = productosOpts.map((p) => ({
        id: p.id,
        nombre: p.nombre,
    }));

    const isMdUp = useViewportIsMdUp();

    const canResetTableSearch =
        searchInput.trim().length > 0 || searchDebounced.length > 0;

    const resetTableSearch = useCallback(() => {
        setSearchInput("");
        setSearchDebounced("");
    }, []);

    return (
        <div className='flex flex-col gap-4'>
            {error ?
                <p className='text-sm text-destructive border border-destructive/30 rounded-md p-3'>{error}</p>
            :   null}

            <MovimientosStockAreaChart
                negocioId={negocioId}
                productoId={productoFiltroId}
                onProductoChange={setProductoFiltroId}
                productosOptions={chartProductOptions}
            />

            <div className='grid max-w-md gap-2'>
                <Label htmlFor='mov-search-producto'>Buscar por producto</Label>
                <div className='flex gap-2'>
                    <Input
                        id='mov-search-producto'
                        type='search'
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder='Nombre o código de barras…'
                        autoComplete='off'
                        disabled={Boolean(productoFiltroId)}
                        aria-disabled={Boolean(productoFiltroId)}
                        className='min-w-0 flex-1 rounded-lg'
                    />
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='shrink-0 rounded-lg'
                        disabled={!canResetTableSearch}
                        onClick={resetTableSearch}
                        title='Limpiar búsqueda'
                        aria-label='Restablecer búsqueda de la tabla'>
                        <RotateCcw className='h-4 w-4' />
                    </Button>
                </div>
                {productoFiltroId ?
                    <p className='text-xs text-muted-foreground'>
                        La búsqueda no aplica con un producto seleccionado en el gráfico. Elegí &quot;Todos los productos&quot; para buscar
                        en la tabla.
                    </p>
                :   null}
            </div>

            <div className='overflow-x-auto rounded-lg border bg-card relative min-h-[120px]'>
                {loadingInitial && rows.length === 0 ?
                    <div className='flex items-center justify-center gap-2 text-muted-foreground py-12 text-sm'>
                        <Loader2 className='h-5 w-5 animate-spin' />
                        Cargando movimientos…
                    </div>
                : rows.length === 0 ?
                    <p className='p-6 text-center text-muted-foreground text-sm'>No hay movimientos de stock.</p>
                : isMdUp ?
                    <table className='w-full text-sm'>
                        <thead className='border-b bg-muted/50 text-left'>
                            <tr>
                                <th className='p-3 font-medium'>Fecha</th>
                                <th className='p-3 font-medium'>Producto</th>
                                <th className='p-3 font-medium'>Operación</th>
                                <th className='p-3 font-medium'>Ref</th>
                                <th className='p-3 font-medium text-right'>P. unit.</th>
                                <th className='p-3 font-medium text-right'>Cantidad</th>
                                <th className='p-3 font-medium'>Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((m) => {
                                const pNum = toPrecioNum(m.precio_unitario);
                                const selected = productoFiltroId === m.producto_id;
                                return (
                                    <tr
                                        key={m.id}
                                        className={cn(
                                            "border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50",
                                            selected && "bg-muted/40",
                                        )}
                                        tabIndex={0}
                                        onClick={() => setProductoFiltroId(m.producto_id)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                setProductoFiltroId(m.producto_id);
                                            }
                                        }}
                                        aria-selected={selected}>
                                        <td className='p-3 whitespace-nowrap tabular-nums'>{formatFecha(m.created_at)}</td>
                                        <td className='p-3 min-w-0 max-w-[12rem] truncate'>{nombreProducto(m)}</td>
                                        <td className='p-3 whitespace-nowrap'>{operacionMovimientoStock(m)}</td>
                                        <td className='p-3 max-w-[9rem] truncate text-muted-foreground text-xs'>{refOperacion(m)}</td>
                                        <td className='p-3 text-right tabular-nums whitespace-nowrap'>
                                            {pNum != null ? formatARS(pNum) : "—"}
                                        </td>
                                        <td className='p-3 text-right tabular-nums'>{m.cantidad}</td>
                                        <td className='p-3 tabular-nums text-xs whitespace-nowrap'>{stockEvolucion(m)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                :   <Accordion type='single' collapsible className='w-full'>
                        {rows.map((m) => {
                            const pNum = toPrecioNum(m.precio_unitario);
                            const selected = productoFiltroId === m.producto_id;
                            return (
                                <AccordionItem key={m.id} value={m.id} className={cn("px-0", selected && "bg-muted/40")}>
                                    <AccordionTrigger
                                        className='gap-2 px-3 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180'
                                        aria-label={`${formatFecha(m.created_at)} · ${nombreProducto(m)} · ${operacionMovimientoStock(m)}. Más información`}>
                                        <div className='grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-left text-sm font-normal'>
                                            <time className='whitespace-nowrap tabular-nums text-muted-foreground' dateTime={m.created_at}>
                                                {formatFecha(m.created_at)}
                                            </time>
                                            <span className='min-w-0 truncate font-medium text-foreground'>{nombreProducto(m)}</span>
                                            <span className='shrink-0 whitespace-nowrap text-xs text-muted-foreground'>
                                                {operacionMovimientoStock(m)}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className='px-3'>
                                        <div className='app-accordion-detail-movimiento grid gap-3'>
                                            <dl className='space-y-2 text-sm'>
                                                <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
                                                    <dt className='shrink-0 text-muted-foreground'>Ref</dt>
                                                    <dd className='min-w-0 max-w-full truncate text-right font-mono text-xs text-foreground'>
                                                        {refOperacion(m)}
                                                    </dd>
                                                </div>
                                                <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
                                                    <dt className='shrink-0 text-muted-foreground'>P. unit.</dt>
                                                    <dd className='tabular-nums text-foreground'>{pNum != null ? formatARS(pNum) : "—"}</dd>
                                                </div>
                                                <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
                                                    <dt className='shrink-0 text-muted-foreground'>Cantidad</dt>
                                                    <dd className='tabular-nums font-medium text-foreground'>{m.cantidad}</dd>
                                                </div>
                                                <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
                                                    <dt className='shrink-0 text-muted-foreground'>Stock</dt>
                                                    <dd className='tabular-nums text-xs text-foreground'>{stockEvolucion(m)}</dd>
                                                </div>
                                            </dl>
                                            <Button
                                                type='button'
                                                variant='secondary'
                                                size='sm'
                                                className='w-full'
                                                onClick={() => setProductoFiltroId(m.producto_id)}>
                                                Mostrar en gráfico
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                }
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
