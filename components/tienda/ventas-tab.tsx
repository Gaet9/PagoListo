"use client";

import { createClient } from "@/lib/supabase/client";
import { listVentasPage } from "@/lib/queries/ventas";
import type { VentaRow } from "@/lib/types/negocio";
import type { KeysetCursor } from "@/lib/types/pagination";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { VentasAreaChart } from "@/components/tienda/ventas-area-chart";
import { DescargarComprobantePagoButton } from "@/components/mercadopago/descargar-comprobante-pago-button";
import { VentaItemsPanel } from "@/components/tienda/venta-items-panel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatVentaDateTimeAr } from "@/lib/utils/format-venta-datetime-ar";

const PAGE_SIZE = 10;

const metodoLabel: Record<string, string> = {
    cash: "Efectivo",
    mercado_pago: "Mercado Pago",
    transfer: "Transferencia",
};

const estadoLabel: Record<string, string> = {
    completed: "Completada",
    cancelled: "Cancelada",
};

type Props = { negocioId: string };

export function VentasTab({ negocioId }: Props) {
    const [rows, setRows] = useState<VentaRow[]>([]);
    const [nextCursor, setNextCursor] = useState<KeysetCursor | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const moneyARS = (v: number) =>
        new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 2,
        }).format(v);

    const toNumber = (v: string | number | null | undefined) => {
        const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
        return Number.isFinite(n) ? n : 0;
    };

    const loadFirstPage = useCallback(async () => {
        setLoadingInitial(true);
        setError(null);
        setHasMore(true);
        setNextCursor(null);
        const supabase = createClient();
        const { data, error: e } = await listVentasPage(supabase, negocioId, {
            limit: PAGE_SIZE,
            cursor: null,
        });
        setLoadingInitial(false);
        if (e) {
            setError(e.message);
            setRows([]);
            return;
        }
        const list = (data as VentaRow[]) ?? [];
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
    }, [negocioId]);

    const loadMore = useCallback(async () => {
        if (!hasMore || loadingMore || !nextCursor) return;
        setLoadingMore(true);
        setError(null);
        const supabase = createClient();
        const { data, error: e } = await listVentasPage(supabase, negocioId, {
            limit: PAGE_SIZE,
            cursor: nextCursor,
        });
        setLoadingMore(false);
        if (e) {
            setError(e.message);
            return;
        }
        const list = (data as VentaRow[]) ?? [];
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
    }, [hasMore, loadingMore, negocioId, nextCursor]);

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

    if (loadingInitial && rows.length === 0) {
        return (
            <div className='flex items-center gap-2 text-muted-foreground py-8'>
                <Loader2 className='h-5 w-5 animate-spin' />
                Cargando ventas…
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-4'>
            {error ?
                <p className='text-sm text-destructive border border-destructive/30 rounded-md p-3'>{error}</p>
            :   null}

            <VentasAreaChart negocioId={negocioId} />

            <div className='rounded-lg border overflow-hidden bg-card'>
                {rows.length === 0 ?
                    <div className='p-6 text-center text-muted-foreground text-sm'>No hay ventas registradas.</div>
                :   <Accordion type='single' collapsible>
                        {rows.map((v) => {
                            const fechaHora = formatVentaDateTimeAr(v.created_at);
                            const [fechaCorta, hora = ""] = fechaHora.split(" ");
                            const total = moneyARS(toNumber(v.total));

                            return (
                                <AccordionItem key={v.id} value={`venta-${v.id}`}>
                                    <AccordionTrigger className='px-4 hover:no-underline' aria-label={`Venta ${fechaCorta} ${total}`}>
                                        <div className='flex-1 min-w-0'>
                                            <div className='flex items-center justify-between gap-3'>
                                                <div className='min-w-0'>
                                                    <div className='font-medium truncate'>{fechaCorta}</div>
                                                    <div className='text-xs text-muted-foreground'>
                                                        {hora} · {metodoLabel[v.metodo_pago] ?? v.metodo_pago} ·{" "}
                                                        {estadoLabel[v.estado] ?? v.estado}
                                                    </div>
                                                </div>
                                                <div className='text-right shrink-0'>
                                                    <div className='font-semibold tabular-nums'>{total}</div>
                                                    <div className='text-xs text-muted-foreground'>Ver productos</div>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className='px-4'>
                                        <div className='app-accordion-detail-venta flex flex-col gap-3'>
                                            <VentaItemsPanel ventaId={v.id} />
                                            {v.metodo_pago === "mercado_pago" && v.estado === "completed" ?
                                                <div className='flex justify-end pt-1'>
                                                    <DescargarComprobantePagoButton ventaId={v.id} />
                                                </div>
                                            :   null}
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
