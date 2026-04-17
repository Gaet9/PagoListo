"use client";

import * as React from "react";
import type { TooltipProps } from "recharts";
import {
  Legend,
  ResponsiveContainer,
  Tooltip,
  type LegendProps,
} from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
    icon?: React.ComponentType<{ className?: string }>;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("Chart components must be used within ChartContainer");
  return ctx;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const css = Object.entries(config)
    .filter(([, v]) => v.color)
    .map(([k, v]) => `--color-${k}: ${v.color};`)
    .join("");

  if (!css) return null;
  return <style>{`[data-chart="${id}"]{${css}}`}</style>;
}

export function ChartContainer({
  id,
  className,
  config,
  children,
}: {
  id?: string;
  className?: string;
  config: ChartConfig;
  children: React.ReactNode;
}) {
  const chartId = React.useId();
  const resolvedId = id ?? chartId;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={resolvedId}
        className={cn(
          "relative h-full w-full min-w-0 shrink-0 overflow-hidden [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-tooltip-cursor]:stroke-border/60",
          className,
        )}
      >
        <ChartStyle id={resolvedId} config={config} />
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={32}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip({
  className,
  ...props
}: React.ComponentProps<typeof Tooltip>) {
  return <Tooltip className={cn(className)} {...props} />;
}

export function ChartTooltipContent({
  className,
  indicator = "line",
  labelFormatter,
  hideLabel = false,
  ...props
}: TooltipProps<number, string> & {
  indicator?: "line" | "dot";
  hideLabel?: boolean;
  labelFormatter?: (label: string) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!props.active || !props.payload?.length) return null;

  const label = props.label ? String(props.label) : "";
  const resolvedLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div
      className={cn(
        "grid min-w-[12rem] gap-2 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-md",
        className,
      )}
    >
      {hideLabel ? null : (
        <div className="text-xs text-muted-foreground">{resolvedLabel}</div>
      )}
      <div className="grid gap-2">
        {props.payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "");
          const cfg = config[key];
          const value =
            typeof item.value === "number"
              ? item.value.toLocaleString("es-AR")
              : String(item.value ?? "");

          return (
            <div key={key} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "shrink-0",
                    indicator === "dot"
                      ? "h-2.5 w-2.5 rounded-full"
                      : "h-2.5 w-4 rounded-sm",
                  )}
                  style={{
                    background:
                      (cfg?.color ? `var(--color-${key})` : undefined) ??
                      (item.color ?? undefined),
                  }}
                />
                <span className="text-muted-foreground">
                  {cfg?.label ?? item.name ?? key}
                </span>
              </div>
              <span className="font-medium tabular-nums">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegend(props: LegendProps) {
  return <Legend {...props} />;
}

export function ChartLegendContent({ className }: { className?: string }) {
  const { config } = useChart();

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4", className)}>
      {Object.entries(config)
        .filter(([k]) => k !== "visitors")
        .map(([key, v]) => (
          <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: v.color ? `var(--color-${key})` : undefined }}
            />
            <span>{v.label ?? key}</span>
          </div>
        ))}
    </div>
  );
}

