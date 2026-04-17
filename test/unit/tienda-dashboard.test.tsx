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
  listProductosPage: async () => ({ data: [], error: null }),
  fetchProductosTotalsForNegocio: async () => ({
    data: {
      lineCount: 0,
      stockTotal: 0,
      sumPrecioCompra: 0,
      sumPrecioVenta: 0,
    },
    error: null,
  }),
  insertProducto: async () => ({ data: null, error: null }),
  updateProducto: async () => ({ data: null, error: null }),
  deleteProducto: async () => ({ data: null, error: null }),
}));
vi.mock("@/lib/queries/ventas", () => ({
  listVentas: async () => ({ data: [], error: null }),
  listVentasPage: async () => ({ data: [], error: null }),
  listVentasTotalsForChart: async () => ({ data: [], error: null }),
  listVentaItemsByVentaId: async () => ({ data: [], error: null }),
}));
vi.mock("@/lib/queries/movimientos-stock", () => ({
  listMovimientosStockPage: async () => ({ data: [], error: null }),
  listMovimientosStockForChart: async () => ({ data: [], error: null }),
  MOVIMIENTOS_STOCK_PAGE_SIZE: 10,
}));
vi.mock("@/lib/queries/compras", () => ({
  insertCompraReposicion: async () => ({ data: { compraId: "c1" }, error: null }),
  listComprasByNegocioPage: async () => ({ data: [], error: null }),
  listCompraItemsByCompraId: async () => ({ data: [], error: null }),
}));
vi.mock("@/lib/storage/compras-comprobantes", () => ({
  uploadCompraComprobante: async () => ({ storagePath: null, error: null }),
  getCompraComprobanteSignedUrl: async () => ({ signedUrl: "https://example.com/x", error: null }),
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

    await user.click(screen.getByRole("button", { name: "Compras" }));
    expect(screen.getByRole("heading", { name: "Mis compras" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar nueva compra/i })).toBeInTheDocument();
  });

  it("usa initialNegocioId cuando hay varios negocios", () => {
    render(
      <TiendaDashboard
        initialNegocios={[
          { id: "n1", nombre: "Primero", localizacion: null },
          { id: "n2", nombre: "Segundo", localizacion: "CABA" },
        ]}
        initialNegocioId="n2"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Segundo" })).toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: /Negocio activo/i });
    expect(select).toHaveValue("n2");
  });
});

