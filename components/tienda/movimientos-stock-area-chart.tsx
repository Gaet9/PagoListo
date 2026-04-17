"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { createClient } from "@/lib/supabase/client";
import { localCalendarDateYmd, parseLocalYmd } from "@/lib/local-calendar-date";
import { listMovimientosStockForChart, type MovimientoStockForChartRow } from "@/lib/queries/movimientos-stock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RotateCcw } from "lucide-react";

export type MovimientosChartProductoOption = {
    id: string;
    nombre: string;
};

type Props = {
    negocioId: string;
    productoId: string | null;
    onProductoChange: (id: string | null) => void;
    productosOptions: MovimientosChartProductoOption[];
};

type ChartPoint = {
    date: string;
    /** Suma de `stock_nuevo` por producto al cierre del día (último movimiento del día con valor; arrastre entre días). */
    stockTotal: number;
    compraArs: number;
    ventaArs: number;
};

const chartConfig = {
    stockTotal: {
        label: "Stock total (u.)",
        color: "hsl(var(--mov-chart-stock))",
    },
    compraArs: {
        label: "Total compra ($)",
        color: "hsl(var(--mov-chart-compra))",
    },
    ventaArs: {
        label: "Total venta ($)",
        color: "hsl(var(--mov-chart-venta))",
    },
} satisfies ChartConfig;

const SUGGESTIONS_MAX = 12;

function startDateFromRange(reference: Date, timeRange: string) {
    let daysToSubtract = 90;
    if (timeRange === "30d") daysToSubtract = 30;
    if (timeRange === "7d") daysToSubtract = 7;
    const start = new Date(reference);
    start.setDate(start.getDate() - daysToSubtract);
    start.setHours(0, 0, 0, 0);
    return start;
}

function toNumber(v: string | number | null | undefined) {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

export function MovimientosStockAreaChart({ negocioId, productoId, onProductoChange, productosOptions }: Props) {
    const [timeRange, setTimeRange] = React.useState("30d");
    const [isSmallScreen, setIsSmallScreen] = React.useState(false);
    const [rows, setRows] = React.useState<MovimientoStockForChartRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [fetchError, setFetchError] = React.useState<string | null>(null);
    const [nombreQuery, setNombreQuery] = React.useState("");
    const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);
    const searchWrapRef = React.useRef<HTMLDivElement | null>(null);

    const selectedProduct = React.useMemo(() => productosOptions.find((p) => p.id === productoId) ?? null, [productosOptions, productoId]);

    const prevProductoIdRef = React.useRef<string | null>(null);
    React.useEffect(() => {
        if (productoId && selectedProduct) {
            setNombreQuery(selectedProduct.nombre);
            setSuggestionsOpen(false);
        } else if (!productoId && prevProductoIdRef.current) {
            setNombreQuery("");
            setSuggestionsOpen(false);
        }
        prevProductoIdRef.current = productoId;
    }, [productoId, selectedProduct]);

    const filteredProductos = React.useMemo(() => {
        const q = nombreQuery.trim().toLowerCase();
        if (!q) return [];
        const out: MovimientosChartProductoOption[] = [];
        for (const p of productosOptions) {
            if (p.nombre.toLowerCase().includes(q)) {
                out.push(p);
                if (out.length >= SUGGESTIONS_MAX) break;
            }
        }
        return out;
    }, [nombreQuery, productosOptions]);

    React.useEffect(() => {
        const onDocMouse = (e: MouseEvent) => {
            const el = searchWrapRef.current;
            if (!el || !suggestionsOpen) return;
            if (e.target instanceof Node && !el.contains(e.target)) {
                setSuggestionsOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocMouse);
        return () => document.removeEventListener("mousedown", onDocMouse);
    }, [suggestionsOpen]);

    const canReset = Boolean(productoId) || nombreQuery.trim().length > 0;

    const resetFiltro = React.useCallback(() => {
        onProductoChange(null);
        setNombreQuery("");
        setSuggestionsOpen(false);
    }, [onProductoChange]);

    React.useEffect(() => {
        if (typeof window.matchMedia !== "function") return;
        const mq = window.matchMedia("(max-width: 639px)");
        const apply = () => setIsSmallScreen(mq.matches);
        apply();
        mq.addEventListener("change", apply);
        return () => mq.removeEventListener("change", apply);
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setFetchError(null);
            const end = new Date();
            const start = startDateFromRange(end, timeRange);
            const supabase = createClient();
            const { data, error } = await listMovimientosStockForChart(supabase, negocioId, {
                fromIso: start.toISOString(),
                toIso: end.toISOString(),
                productoId,
            });
            if (cancelled) return;
            setLoading(false);
            if (error) {
                setFetchError(error.message);
                setRows([]);
                return;
            }
            setRows((data as MovimientoStockForChartRow[]) ?? []);
        })();
        return () => {
            cancelled = true;
        };
    }, [negocioId, timeRange, productoId]);

    const formatArs = React.useCallback(
        (value: number) => {
            const n = Number(value);
            if (!Number.isFinite(n)) return "";
            try {
                return n.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                    maximumFractionDigits: isSmallScreen ? 0 : 0,
                    notation: isSmallScreen ? "compact" : "standard",
                });
            } catch {
                return n.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                    maximumFractionDigits: 0,
                });
            }
        },
        [isSmallScreen],
    );

    const points = React.useMemo(() => {
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        const start = startDateFromRange(end, timeRange);

        const rowsByDay = new Map<string, MovimientoStockForChartRow[]>();
        for (const r of rows) {
            const d = new Date(r.created_at);
            d.setHours(0, 0, 0, 0);
            if (d < start || d > end) continue;
            const key = localCalendarDateYmd(d);
            const arr = rowsByDay.get(key) ?? [];
            arr.push(r);
            rowsByDay.set(key, arr);
        }
        for (const arr of rowsByDay.values()) {
            arr.sort((a, b) => a.created_at.localeCompare(b.created_at) || String(a.id).localeCompare(String(b.id)));
        }

        const runningStockByProduct = new Map<string, number>();
        const out: ChartPoint[] = [];
        const cursor = new Date(start);
        cursor.setHours(0, 0, 0, 0);
        while (cursor <= end) {
            const key = localCalendarDateYmd(cursor);
            const dayRows = rowsByDay.get(key) ?? [];

            let compraArs = 0;
            let ventaArs = 0;
            for (const r of dayRows) {
                const qty = Math.abs(Math.trunc(Number(r.cantidad)));
                const pu = toNumber(r.precio_unitario);
                const lineArs = qty * pu;
                if (r.tipo === "in") {
                    compraArs += lineArs;
                } else if (r.tipo === "out") {
                    ventaArs += lineArs;
                }
                if (r.stock_nuevo != null) {
                    const sn = Math.trunc(Number(r.stock_nuevo));
                    if (Number.isFinite(sn) && sn >= 0) {
                        runningStockByProduct.set(r.producto_id, sn);
                    }
                }
            }

            let stockTotal = 0;
            for (const v of runningStockByProduct.values()) {
                stockTotal += v;
            }

            out.push({ date: key, stockTotal, compraArs, ventaArs });
            cursor.setDate(cursor.getDate() + 1);
        }
        return out;
    }, [rows, timeRange]);

    return (
        <Card className='pt-0'>
            <CardHeader className='flex flex-col gap-4 border-b py-5'>
                <CardTitle>Movimientos por día</CardTitle>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6'>
                    <div ref={searchWrapRef} className='grid min-w-0 flex-1 gap-1 sm:max-w-md'>
                        <Label htmlFor='mov-chart-producto-search' className='text-xs text-muted-foreground'>
                            Buscar producto
                        </Label>
                        <div className='flex gap-2'>
                            <div className='relative min-w-0 flex-1'>
                                <Input
                                    id='mov-chart-producto-search'
                                    type='search'
                                    value={nombreQuery}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setNombreQuery(v);
                                        setSuggestionsOpen(v.trim().length > 0);
                                    }}
                                    onFocus={() => {
                                        if (!productoId && nombreQuery.trim().length > 0) {
                                            setSuggestionsOpen(true);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            setSuggestionsOpen(false);
                                        }
                                    }}
                                    placeholder='Nombre del producto…'
                                    autoComplete='off'
                                    readOnly={Boolean(productoId)}
                                    aria-label='Buscar producto por nombre'
                                    className='rounded-lg'
                                />
                                {suggestionsOpen && !productoId && filteredProductos.length > 0 ?
                                    <div className='absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-md'>
                                        {filteredProductos.map((p) => (
                                            <button
                                                key={p.id}
                                                type='button'
                                                className='flex w-full px-3 py-2 text-left text-sm hover:bg-muted'
                                                onClick={() => {
                                                    onProductoChange(p.id);
                                                    setNombreQuery(p.nombre);
                                                    setSuggestionsOpen(false);
                                                }}>
                                                {p.nombre}
                                            </button>
                                        ))}
                                    </div>
                                :   null}
                            </div>
                            <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                className='shrink-0 rounded-lg'
                                disabled={!canReset}
                                onClick={resetFiltro}
                                title='Todos los productos'
                                aria-label='Restablecer: todos los productos'>
                                <RotateCcw className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>
                    <div className='w-full shrink-0 sm:w-auto sm:min-w-[180px]'>
                        <Label htmlFor='mov-chart-time-range' className='sr-only'>
                            Rango de fechas
                        </Label>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger
                                id='mov-chart-time-range'
                                className='w-full rounded-lg sm:w-[180px]'
                                aria-label='Seleccionar rango'>
                                <SelectValue placeholder='Últimos 30 días' />
                            </SelectTrigger>
                            <SelectContent className='rounded-xl'>
                                <SelectItem value='90d' className='rounded-lg'>
                                    Últimos 90 días
                                </SelectItem>
                                <SelectItem value='30d' className='rounded-lg'>
                                    Últimos 30 días
                                </SelectItem>
                                <SelectItem value='7d' className='rounded-lg'>
                                    Últimos 7 días
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className='min-w-0 px-2 py-6 sm:px-6 sm:py-6'>
                {fetchError ?
                    <p className='text-sm text-destructive mb-3'>{fetchError}</p>
                :   null}
                {loading ?
                    <div className='flex h-[250px] min-w-0 items-center justify-center gap-2 text-muted-foreground text-sm'>
                        <Loader2 className='h-5 w-5 animate-spin' />
                        Cargando gráfico…
                    </div>
                :   <ChartContainer config={chartConfig} className='h-[280px] w-full min-w-0'>
                        <AreaChart data={points}>
                            <defs>
                                <linearGradient id='fillMovStock' x1='0' y1='0' x2='0' y2='1'>
                                    <stop offset='5%' stopColor='hsl(var(--mov-chart-stock-from))' stopOpacity={0.78} />
                                    <stop offset='95%' stopColor='hsl(var(--mov-chart-stock-to))' stopOpacity={0.12} />
                                </linearGradient>
                                <linearGradient id='fillMovCompra' x1='0' y1='0' x2='0' y2='1'>
                                    <stop offset='5%' stopColor='hsl(var(--mov-chart-compra-from))' stopOpacity={0.72} />
                                    <stop offset='95%' stopColor='hsl(var(--mov-chart-compra-to))' stopOpacity={0.12} />
                                </linearGradient>
                                <linearGradient id='fillMovVenta' x1='0' y1='0' x2='0' y2='1'>
                                    <stop offset='5%' stopColor='hsl(var(--mov-chart-venta-from))' stopOpacity={0.72} />
                                    <stop offset='95%' stopColor='hsl(var(--mov-chart-venta-to))' stopOpacity={0.12} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey='date'
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tickFormatter={(value) =>
                                    parseLocalYmd(String(value)).toLocaleDateString("es-AR", {
                                        month: "short",
                                        day: "numeric",
                                    })
                                }
                            />
                            <YAxis
                                yAxisId='u'
                                width={isSmallScreen ? 36 : 48}
                                orientation='left'
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tick={{ fontSize: isSmallScreen ? 10 : 11 }}
                                tickFormatter={(v) => String(Math.round(Number(v)))}
                            />
                            <YAxis
                                yAxisId='ars'
                                orientation='right'
                                width={isSmallScreen ? 44 : 88}
                                mirror={isSmallScreen}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={isSmallScreen ? 6 : 10}
                                tick={{ fontSize: isSmallScreen ? 10 : 11 }}
                                tickFormatter={(v) => formatArs(Number(v))}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(value) =>
                                            parseLocalYmd(String(value)).toLocaleDateString("es-AR", {
                                                weekday: "short",
                                                day: "2-digit",
                                                month: "short",
                                            })
                                        }
                                        indicator='dot'
                                    />
                                }
                            />
                            <Area
                                yAxisId='u'
                                dataKey='stockTotal'
                                type='natural'
                                fill='url(#fillMovStock)'
                                stroke='hsl(var(--mov-chart-stock))'
                            />
                            <Area
                                yAxisId='ars'
                                dataKey='compraArs'
                                type='natural'
                                fill='url(#fillMovCompra)'
                                stroke='hsl(var(--mov-chart-compra))'
                            />
                            <Area
                                yAxisId='ars'
                                dataKey='ventaArs'
                                type='natural'
                                fill='url(#fillMovVenta)'
                                stroke='hsl(var(--mov-chart-venta))'
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                        </AreaChart>
                    </ChartContainer>
                }
            </CardContent>
        </Card>
    );
}
