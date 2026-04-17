import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { CompraItemsPanel } from "@/components/tienda/compra-items-panel";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const listCompraItemsByCompraIdMock = vi.fn();

vi.mock("@/lib/queries/compras", () => ({
  listCompraItemsByCompraId: (...args: unknown[]) => listCompraItemsByCompraIdMock(...args),
}));

describe("CompraItemsPanel", () => {
  beforeEach(() => {
    listCompraItemsByCompraIdMock.mockReset();
  });

  it("carga y muestra las líneas de la compra", async () => {
    listCompraItemsByCompraIdMock.mockResolvedValue({
      data: [
        {
          id: "ci1",
          compra_id: "c1",
          producto_id: "p1",
          cantidad: 2,
          precio_unitario: 150,
          subtotal: 300,
          productos: { nombre: "Yerba" },
        },
      ],
      error: null,
    });

    render(<CompraItemsPanel compraId='c1' />);

    await waitFor(() => {
      expect(screen.getByText("Yerba")).toBeInTheDocument();
    });
    expect(screen.getByText(/2 ×/)).toBeInTheDocument();
  });
});
