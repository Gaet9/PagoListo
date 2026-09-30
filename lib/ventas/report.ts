import {
  localCalendarDateYmd,
  parseLocalYmd,
} from "@/lib/local-calendar-date";
import type { VentaTotalRow } from "@/lib/queries/ventas";

export type VentasReportPreset = "hoy" | "semana" | "custom";

export type VentasReportRange = {
  preset: VentasReportPreset;
  fromYmd: string;
  toYmd: string;
  fromIso: string;
  toIso: string;
};

export type VentasReportDayRow = {
  date: string;
  total: number;
  ventaCount: number;
};

export type VentasReportSummary = {
  days: VentasReportDayRow[];
  totalAmount: number;
  ventaCount: number;
};

function toNumber(v: string | number | null | undefined): number {
  const n =
    typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function startOfWeekMondayLocal(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const weekday = copy.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function endOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) return false;
  const parsed = parseLocalYmd(ymd);
  return !Number.isNaN(parsed.getTime());
}

export type ResolveVentasReportRangeInput = {
  preset: VentasReportPreset;
  customFromYmd?: string;
  customToYmd?: string;
};

/**
 * Rango inclusive por calendario local; `toIso` usa «ahora» en presets fijos
 * (hoy / semana) para no incluir ventas futuras del mismo día.
 */
export function resolveVentasReportRange(
  input: ResolveVentasReportRangeInput,
  now: Date = new Date(),
): VentasReportRange | { error: string } {
  const preset = input.preset;

  if (preset === "hoy") {
    const fromYmd = localCalendarDateYmd(now);
    return {
      preset,
      fromYmd,
      toYmd: fromYmd,
      fromIso: parseLocalYmd(fromYmd).toISOString(),
      toIso: now.toISOString(),
    };
  }

  if (preset === "semana") {
    const start = startOfWeekMondayLocal(now);
    const fromYmd = localCalendarDateYmd(start);
    const toYmd = localCalendarDateYmd(now);
    return {
      preset,
      fromYmd,
      toYmd,
      fromIso: start.toISOString(),
      toIso: now.toISOString(),
    };
  }

  const fromYmd = (input.customFromYmd ?? "").trim();
  const toYmd = (input.customToYmd ?? "").trim();
  if (!isValidYmd(fromYmd) || !isValidYmd(toYmd)) {
    return { error: "Fechas inválidas" };
  }
  if (parseLocalYmd(fromYmd) > parseLocalYmd(toYmd)) {
    return { error: "La fecha desde no puede ser posterior a la fecha hasta" };
  }

  return {
    preset,
    fromYmd,
    toYmd,
    fromIso: parseLocalYmd(fromYmd).toISOString(),
    toIso: endOfLocalDay(parseLocalYmd(toYmd)).toISOString(),
  };
}

export function summarizeVentasTotals(
  rows: VentaTotalRow[],
  fromYmd: string,
  toYmd: string,
): VentasReportSummary {
  const fromDate = parseLocalYmd(fromYmd);
  const toDate = parseLocalYmd(toYmd);
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);

  const byDay = new Map<string, { total: number; ventaCount: number }>();
  let totalAmount = 0;
  let ventaCount = 0;

  for (const row of rows) {
    const d = new Date(row.created_at);
    d.setHours(0, 0, 0, 0);
    if (d < fromDate || d > toDate) continue;
    const key = localCalendarDateYmd(d);
    const amount = toNumber(row.total);
    totalAmount += amount;
    ventaCount += 1;
    const prev = byDay.get(key) ?? { total: 0, ventaCount: 0 };
    byDay.set(key, {
      total: prev.total + amount,
      ventaCount: prev.ventaCount + 1,
    });
  }

  const days: VentasReportDayRow[] = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    const key = localCalendarDateYmd(cursor);
    const bucket = byDay.get(key);
    days.push({
      date: key,
      total: bucket?.total ?? 0,
      ventaCount: bucket?.ventaCount ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { days, totalAmount, ventaCount };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV con rollup diario y fila TOTAL (mismo filtro que el reporte). */
export function buildVentasReportCsv(summary: VentasReportSummary): string {
  const lines = ["Fecha,Total (ARS),Cantidad ventas"];
  for (const day of summary.days) {
    lines.push(
      [
        csvEscape(day.date),
        day.total.toFixed(2),
        String(day.ventaCount),
      ].join(","),
    );
  }
  lines.push(
    [
      "TOTAL",
      summary.totalAmount.toFixed(2),
      String(summary.ventaCount),
    ].join(","),
  );
  return `${lines.join("\n")}\n`;
}

export function parseVentasReportExportSearchParams(
  searchParams: URLSearchParams,
): ResolveVentasReportRangeInput & { negocioId: string } | { error: string } {
  const negocioId = (searchParams.get("negocioId") ?? "").trim();
  if (!negocioId) {
    return { error: "Falta negocioId" };
  }

  const presetRaw = (searchParams.get("preset") ?? "semana").trim();
  if (presetRaw !== "hoy" && presetRaw !== "semana" && presetRaw !== "custom") {
    return { error: "Preset inválido" };
  }

  return {
    negocioId,
    preset: presetRaw,
    customFromYmd: searchParams.get("from") ?? undefined,
    customToYmd: searchParams.get("to") ?? undefined,
  };
}
