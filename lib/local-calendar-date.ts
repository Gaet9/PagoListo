/**
 * Fechas de calendario en zona local del navegador (alineado con tablas que usan
 * `Intl` / `getDate()`), sin desfase por UTC de `toISOString().slice(0, 10)`.
 */

/** Devuelve `YYYY-MM-DD` según el calendario local de `d`. */
export function localCalendarDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Interpreta `YYYY-MM-DD` como medianoche en **calendario local** (no como UTC).
 * Útil para ejes y tooltips cuando la clave de datos ya es YMD local.
 */
export function parseLocalYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}
