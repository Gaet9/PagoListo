import { describe, it, expect } from "vitest";

import { localCalendarDateYmd, parseLocalYmd } from "@/lib/local-calendar-date";

describe("local-calendar-date", () => {
  it("localCalendarDateYmd usa año/mes/día local", () => {
    const d = new Date(2026, 3, 16, 23, 30, 0);
    expect(localCalendarDateYmd(d)).toBe("2026-04-16");
  });

  it("parseLocalYmd construye medianoche local", () => {
    const d = parseLocalYmd("2026-04-17");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(17);
    expect(d.getHours()).toBe(0);
  });

  it("parseLocalYmd inválido devuelve NaN", () => {
    expect(Number.isNaN(parseLocalYmd("").getTime())).toBe(true);
  });
});
