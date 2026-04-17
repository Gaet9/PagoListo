import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CobrarTab } from "@/components/tienda/cobrar-tab";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const listProductosMock = vi.fn();
vi.mock("@/lib/queries/productos", () => ({
  listProductos: (...args: unknown[]) => listProductosMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

// Avoid invoking camera logic in unit tests
vi.mock("@/components/tienda/barcode-scanner-dialog", () => ({
  BarcodeScannerDialog: () => null,
}));

describe("CobrarTab", () => {
  beforeEach(() => {
    listProductosMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("adds product from search suggestion and updates total", async () => {
    const user = userEvent.setup();
    listProductosMock.mockResolvedValue({
      data: [
        {
          id: "p1",
          negocio_id: "n1",
          nombre: "Coca Cola",
          barcode: "123",
          precio_compra: 100,
          precio_venta: 150,
          stock_actual: 10,
          activo: true,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    render(<CobrarTab negocioId="n1" />);

    const input = await screen.findByPlaceholderText("Nombre o código de barras…");
    await user.type(input, "coca");

    await user.click(await screen.findByRole("button", { name: /Coca Cola/i }));

    expect(toastSuccess).toHaveBeenCalledWith("Producto añadido");
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText(/\$?\s*150/).length).toBeGreaterThan(0);
  });

  it("validates exact barcode and adds product", async () => {
    const user = userEvent.setup();
    listProductosMock.mockResolvedValue({
      data: [
        {
          id: "p1",
          negocio_id: "n1",
          nombre: "Pan",
          barcode: "999",
          precio_compra: 10,
          precio_venta: 20,
          stock_actual: 10,
          activo: true,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });

    render(<CobrarTab negocioId="n1" />);

    const input = await screen.findByPlaceholderText("Nombre o código de barras…");
    await user.type(input, "999");
    await user.click(screen.getByRole("button", { name: "Validar" }));

    expect(toastSuccess).toHaveBeenCalledWith("Producto añadido");
    expect(screen.getByText(/Pan/)).toBeInTheDocument();
  });
});

