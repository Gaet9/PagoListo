import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import {
  buildVentasReportCsv,
  resolveVentasReportRange,
  summarizeVentasTotals,
} from "@/lib/ventas/report";
import type { VentaTotalRow } from "@/lib/queries/ventas";

describe("resolveVentasReportRange", () => {
  const ref = new Date(2026, 8, 30, 15, 30, 0, 0);

  it("hoy usa el mismo día calendario", () => {
    const r = resolveVentasReportRange({ preset: "hoy" }, ref);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.fromYmd).toBe("2026-09-30");
    expect(r.toYmd).toBe("2026-09-30");
    expect(r.toIso).toBe(ref.toISOString());
  });

  it("esta semana arranca el lunes de la semana actual", () => {
    const r = resolveVentasReportRange({ preset: "semana" }, ref);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.fromYmd).toBe("2026-09-28");
    expect(r.toYmd).toBe("2026-09-30");
  });

  it("personalizado valida orden de fechas", () => {
    const bad = resolveVentasReportRange({
      preset: "custom",
      customFromYmd: "2026-09-10",
      customToYmd: "2026-09-01",
    });
    expect("error" in bad).toBe(true);

    const ok = resolveVentasReportRange({
      preset: "custom",
      customFromYmd: "2026-09-01",
      customToYmd: "2026-09-03",
    });
    expect("error" in ok).toBe(false);
    if ("error" in ok) return;
    expect(ok.fromYmd).toBe("2026-09-01");
    expect(ok.toYmd).toBe("2026-09-03");
  });
});

describe("summarizeVentasTotals", () => {
  it("calcula KPIs y rellena días sin ventas", () => {
    const rows: VentaTotalRow[] = [
      { created_at: new Date(2026, 0, 2, 10, 0).toISOString(), total: 100 },
      { created_at: new Date(2026, 0, 2, 18, 0).toISOString(), total: "50.5" },
      { created_at: new Date(2026, 0, 4, 9, 0).toISOString(), total: 200 },
    ];

    const summary = summarizeVentasTotals(rows, "2026-01-01", "2026-01-04");
    expect(summary.ventaCount).toBe(3);
    expect(summary.totalAmount).toBeCloseTo(350.5);
    expect(summary.days).toHaveLength(4);
    expect(summary.days[0]).toEqual({
      date: "2026-01-01",
      total: 0,
      ventaCount: 0,
    });
    expect(summary.days[1]).toEqual({
      date: "2026-01-02",
      total: 150.5,
      ventaCount: 2,
    });
  });
});

describe("buildVentasReportCsv", () => {
  it("incluye filas diarias y TOTAL", () => {
    const csv = buildVentasReportCsv({
      days: [
        { date: "2026-01-02", total: 150.5, ventaCount: 2 },
        { date: "2026-01-03", total: 0, ventaCount: 0 },
      ],
      totalAmount: 150.5,
      ventaCount: 2,
    });

    expect(csv).toContain("Fecha,Total (ARS),Cantidad ventas");
    expect(csv).toContain("2026-01-02,150.50,2");
    expect(csv).toContain("2026-01-03,0.00,0");
    expect(csv).toContain("TOTAL,150.50,2");
  });
});

const listVentasTotalsForChartMock = vi.fn();
const denyUnlessNegocioManagerMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/lib/queries/ventas", () => ({
  listVentasTotalsForChart: (...args: unknown[]) =>
    listVentasTotalsForChartMock(...args),
}));

vi.mock("@/lib/auth/negocio-manager-api", () => ({
  denyUnlessNegocioManager: (...args: unknown[]) =>
    denyUnlessNegocioManagerMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

describe("GET /api/negocios/ventas-report/export", () => {
  beforeEach(() => {
    listVentasTotalsForChartMock.mockReset();
    denyUnlessNegocioManagerMock.mockReset();
    getUserMock.mockReset();
  });

  it("403 para no manager", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    denyUnlessNegocioManagerMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
    );

    const { GET } = await import(
      "@/app/api/negocios/ventas-report/export/route"
    );
    const req = new NextRequest(
      "http://localhost/api/negocios/ventas-report/export?negocioId=n1&preset=hoy",
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("devuelve CSV para manager", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    denyUnlessNegocioManagerMock.mockResolvedValue(null);
    listVentasTotalsForChartMock.mockResolvedValue({
      data: [
        {
          created_at: new Date(2026, 0, 2, 12, 0).toISOString(),
          total: 100,
        },
      ],
      error: null,
    });

    const { GET } = await import(
      "@/app/api/negocios/ventas-report/export/route"
    );
    const req = new NextRequest(
      "http://localhost/api/negocios/ventas-report/export?negocioId=n1&preset=custom&from=2026-01-01&to=2026-01-02",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const body = await res.text();
    expect(body).toContain("TOTAL,100.00,1");
  });
});
