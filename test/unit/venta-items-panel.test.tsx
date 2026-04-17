import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { VentaItemsPanel } from "@/components/tienda/venta-items-panel";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const listVentaItemsByVentaIdMock = vi.fn();

vi.mock("@/lib/queries/ventas", () => ({
  listVentaItemsByVentaId: (...args: unknown[]) =>
    listVentaItemsByVentaIdMock(...args),
}));

describe("VentaItemsPanel", () => {
  beforeEach(() => {
    listVentaItemsByVentaIdMock.mockReset();
  });

  it("loads and renders line items", async () => {
    listVentaItemsByVentaIdMock.mockResolvedValue({
      data: [
        {
          id: "it1",
          venta_id: "v1",
          producto_id: "p1",
          cantidad: 1,
          precio_unitario: 100,
          subtotal: 100,
          productos: { nombre: "Pan" },
        },
      ],
      error: null,
    });

    render(<VentaItemsPanel ventaId="v1" />);

    await waitFor(() => {
      expect(screen.getByText("Pan")).toBeInTheDocument();
    });
  });
});
