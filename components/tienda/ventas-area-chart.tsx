"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { createClient } from "@/lib/supabase/client";
import { localCalendarDateYmd, parseLocalYmd } from "@/lib/local-calendar-date";
import {
  listVentasTotalsForChart,
  type VentaTotalRow,
} from "@/lib/queries/ventas";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Loader2 } from "lucide-react";

type Props = {
  negocioId: string;
};

type ChartPoint = {
  date: string; // YYYY-MM-DD
  total: number;
};

const chartConfig = {
  total: {
    label: "Total vendido",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

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
  const n =
    typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function VentasAreaChart({ negocioId }: Props) {
  const [timeRange, setTimeRange] = React.useState("30d");
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  const [rows, setRows] = React.useState<VentaTotalRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
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
      const { data, error } = await listVentasTotalsForChart(supabase, negocioId, {
        fromIso: start.toISOString(),
        toIso: end.toISOString(),
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
  }, [negocioId, timeRange]);

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

  const points = React.useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = startDateFromRange(end, timeRange);

    const byDay = new Map<string, number>();
    for (const v of rows) {
      const d = new Date(v.created_at);
      d.setHours(0, 0, 0, 0);
      if (d < start || d > end) continue;
      const key = localCalendarDateYmd(d);
      const n = toNumber(v.total);
      byDay.set(key, (byDay.get(key) ?? 0) + n);
    }

    const out: ChartPoint[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      const key = localCalendarDateYmd(cursor);
      out.push({ date: key, total: byDay.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [rows, timeRange]);

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Ventas por día</CardTitle>
          <CardDescription>
            Total vendido en el rango (todas las ventas del negocio).
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[180px] rounded-lg sm:ml-auto"
            aria-label="Seleccionar rango"
          >
            <SelectValue placeholder="Últimos 30 días" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Últimos 90 días
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Últimos 30 días
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Últimos 7 días
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="min-w-0 px-2 py-6 sm:px-6 sm:py-6">
        {fetchError ? (
          <p className="text-sm text-destructive mb-3">{fetchError}</p>
        ) : null}
        {loading ? (
          <div className="flex h-[250px] min-w-0 items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando gráfico…
          </div>
        ) : (
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
