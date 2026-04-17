import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { VentasAreaChart } from "@/components/tienda/ventas-area-chart";

const listVentasTotalsForChartMock = vi.fn();

vi.mock("@/lib/queries/ventas", () => ({
    listVentasTotalsForChart: (...args: unknown[]) => listVentasTotalsForChartMock(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({}),
}));

// Recharts relies on layout APIs not available in jsdom.
vi.mock("recharts", () => {
    const Mock = ({ children }: { children?: React.ReactNode }) => <svg data-mock='recharts'>{children}</svg>;
    return {
        Area: Mock,
        AreaChart: Mock,
        CartesianGrid: Mock,
        ResponsiveContainer: Mock,
        Tooltip: Mock,
        Legend: Mock,
        XAxis: Mock,
        YAxis: Mock,
    };
});

describe("VentasAreaChart", () => {
    beforeEach(() => {
        listVentasTotalsForChartMock.mockReset();
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: (query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addEventListener: () => {},
                removeEventListener: () => {},
                addListener: () => {},
                removeListener: () => {},
                dispatchEvent: () => false,
            }),
        });
    });

    it("loads chart data and renders range selector", async () => {
        listVentasTotalsForChartMock.mockResolvedValue({
            data: [
                {
                    created_at: new Date("2026-01-02T12:00:00.000Z").toISOString(),
                    total: 1500,
                },
            ],
            error: null,
        });

        render(<VentasAreaChart negocioId='n1' />);

        expect(screen.getByText("Ventas por día")).toBeInTheDocument();
        expect(screen.getByLabelText("Seleccionar rango")).toBeInTheDocument();

        await waitFor(() => {
            expect(listVentasTotalsForChartMock).toHaveBeenCalled();
        });
    });
});
