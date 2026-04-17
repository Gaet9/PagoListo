import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TiendaDashboard } from "@/components/tienda/tienda-dashboard";

// Avoid Supabase client creation in passive effects.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));
vi.mock("@/lib/queries/productos", () => ({
  listProductos: async () => ({ data: [], error: null }),
  insertProducto: async () => ({ data: null, error: null }),
  updateProducto: async () => ({ data: null, error: null }),
  deleteProducto: async () => ({ data: null, error: null }),
}));
vi.mock("@/lib/queries/ventas", () => ({
  listVentas: async () => ({ data: [], error: null }),
}));
vi.mock("@/lib/queries/movimientos-stock", () => ({
  listMovimientosForNegocio: async () => ({ data: [], error: null }),
}));
vi.mock("@/components/tienda/barcode-scanner-dialog", () => ({
  BarcodeScannerDialog: () => null,
}));

describe("TiendaDashboard", () => {
  it("renders tabs and switches to Cobrar", async () => {
    const user = userEvent.setup();
    render(
      <TiendaDashboard
        initialNegocios={[{ id: "n1", nombre: "Mi negocio", localizacion: null }]}
      />,
    );

    expect(screen.getByRole("button", { name: "Cobrar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Productos" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cobrar" }));
    expect(screen.getByRole("heading", { name: "Cobrar" })).toBeInTheDocument();
  });
});

