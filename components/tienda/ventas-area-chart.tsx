"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { createClient } from "@/lib/supabase/client";
import { parseLocalYmd } from "@/lib/local-calendar-date";
import {
  listVentasTotalsForChart,
  type VentaTotalRow,
} from "@/lib/queries/ventas";
import {
  resolveVentasReportRange,
  summarizeVentasTotals,
  type VentasReportPreset,
} from "@/lib/ventas/report";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  negocioId: string;
};

type ChartPoint = {
  date: string;
  total: number;
};

const chartConfig = {
  total: {
    label: "Total vendido",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function VentasAreaChart({ negocioId }: Props) {
  const [preset, setPreset] = React.useState<VentasReportPreset>("semana");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  const [rows, setRows] = React.useState<VentaTotalRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const range = React.useMemo(() => {
    const resolved = resolveVentasReportRange({
      preset,
      customFromYmd: customFrom,
      customToYmd: customTo,
    });
    if ("error" in resolved) return null;
    return resolved;
  }, [preset, customFrom, customTo]);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsSmallScreen(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  React.useEffect(() => {
    if (!range) {
      setLoading(false);
      setRows([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchError(null);
      const supabase = createClient();
      const { data, error } = await listVentasTotalsForChart(supabase, negocioId, {
        fromIso: range.fromIso,
        toIso: range.toIso,
      });
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setFetchError(error.message);
        setRows([]);
        return;
      }
      setRows((data as VentaTotalRow[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [negocioId, range]);

  const formatArs = React.useCallback(
    (value: number) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return "";

      try {
        return n.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: isSmallScreen ? 1 : 0,
          notation: isSmallScreen ? "compact" : "standard",
        });
      } catch {
        return n.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: isSmallScreen ? 1 : 0,
        });
      }
    },
    [isSmallScreen],
  );

  const summary = React.useMemo(() => {
    if (!range) {
      return { days: [], totalAmount: 0, ventaCount: 0 };
    }
    return summarizeVentasTotals(rows, range.fromYmd, range.toYmd);
  }, [rows, range]);

  const points = React.useMemo((): ChartPoint[] => {
    return summary.days.map((d) => ({ date: d.date, total: d.total }));
  }, [summary.days]);

  const rangeInvalid = preset === "custom" && !range;

  const handleExportCsv = async () => {
    if (!range) return;
    setExporting(true);
    setExportError(null);
    try {
      const params = new URLSearchParams({
        negocioId,
        preset,
      });
      if (preset === "custom") {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      const res = await fetch(
        `/api/negocios/ventas-report/export?${params.toString()}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setExportError(body?.error ?? "No se pudo exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ventas-${range.fromYmd}_${range.toYmd}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("No se pudo exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="pt-0">
      <CardHeader className="flex flex-col gap-3 border-b py-5 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-1">
          <CardTitle>Resumen de ventas</CardTitle>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:ml-auto">
          <Select
            value={preset}
            onValueChange={(v) => setPreset(v as VentasReportPreset)}
          >
            <SelectTrigger
              className="w-full rounded-lg sm:w-[180px]"
              aria-label="Seleccionar período"
            >
              <SelectValue placeholder="Esta semana" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="hoy" className="rounded-lg">
                Hoy
              </SelectItem>
              <SelectItem value="semana" className="rounded-lg">
                Esta semana
              </SelectItem>
              <SelectItem value="custom" className="rounded-lg">
                Personalizado
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || rangeInvalid || exporting}
            onClick={() => void handleExportCsv()}
          >
            {exporting ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando…
              </>
            :   "Exportar CSV"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 px-2 py-4 sm:px-6 sm:py-5">
        {preset === "custom" ?
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Desde</span>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                aria-label="Fecha desde"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Hasta</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                aria-label="Fecha hasta"
              />
            </label>
          </div>
        :   null}

        {rangeInvalid ?
          <p className="text-sm text-destructive mb-3">
            Elegí un rango de fechas válido.
          </p>
        :   null}

        {fetchError ?
          <p className="text-sm text-destructive mb-3">{fetchError}</p>
        :   null}
        {exportError ?
          <p className="text-sm text-destructive mb-3">{exportError}</p>
        :   null}

        {!rangeInvalid ?
          <dl className="mb-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 sm:max-w-md">
            <div>
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {loading ? "—" : formatArs(summary.totalAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Ventas</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {loading ? "—" : summary.ventaCount}
              </dd>
            </div>
          </dl>
        :   null}

        {loading ?
          <div className="flex h-[250px] min-w-0 items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando…
          </div>
        : rangeInvalid ? null : (
          <ChartContainer
            config={chartConfig}
            className="h-[250px] w-full min-w-0"
          >
            <AreaChart data={points}>
              <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--chart-1-from))"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--chart-1-to))"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
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
                width={isSmallScreen ? 44 : 104}
                mirror={isSmallScreen}
                tickLine={false}
                axisLine={false}
                tickMargin={isSmallScreen ? 6 : 12}
                tick={{ fontSize: isSmallScreen ? 10 : 12 }}
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
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="total"
                type="natural"
                fill="url(#fillTotal)"
                stroke="hsl(var(--chart-1))"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
