import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { MovimientosStockAreaChart } from "@/components/tienda/movimientos-stock-area-chart";

const listMovimientosStockForChartMock = vi.fn();

vi.mock("recharts", () => {
  const Mock = ({ children }: { children?: React.ReactNode }) => (
    <svg data-mock="recharts">{children}</svg>
  );
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div data-mock="responsive" style={{ width: 400, height: 280 }}>
        {children}
      </div>
    ),
    Area: Mock,
    AreaChart: Mock,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Legend: () => null,
    Tooltip: () => null,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

vi.mock("@/lib/queries/movimientos-stock", () => ({
  listMovimientosStockForChart: (...args: unknown[]) =>
    listMovimientosStockForChartMock(...args),
}));

describe("MovimientosStockAreaChart", () => {
  beforeEach(() => {
    listMovimientosStockForChartMock.mockReset();
    listMovimientosStockForChartMock.mockResolvedValue({ data: [], error: null });
  });

  it("muestra título, búsqueda por nombre y restablecer", async () => {
    render(
      <MovimientosStockAreaChart
        negocioId="n1"
        productoId={null}
        onProductoChange={vi.fn()}
        productosOptions={[
          { id: "p1", nombre: "Agua" },
          { id: "p2", nombre: "Pan" },
        ]}
      />,
    );

    expect(await screen.findByText("Movimientos por día")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar producto por nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Restablecer: todos los productos")).toBeDisabled();
    expect(listMovimientosStockForChartMock).toHaveBeenCalled();
  });
});
