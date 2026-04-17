import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductosTab } from "@/components/tienda/productos-tab";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const listProductosMock = vi.fn();
const insertProductoMock = vi.fn();
const updateProductoMock = vi.fn();
const deleteProductoMock = vi.fn();

vi.mock("@/lib/queries/productos", () => ({
  listProductos: (...args: unknown[]) => listProductosMock(...args),
  insertProducto: (...args: unknown[]) => insertProductoMock(...args),
  updateProducto: (...args: unknown[]) => updateProductoMock(...args),
  deleteProducto: (...args: unknown[]) => deleteProductoMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

// avoid camera / zxing in unit tests
vi.mock("@/components/tienda/barcode-scanner-dialog", () => ({
  BarcodeScannerDialog: () => null,
}));

describe("ProductosTab", () => {
  beforeEach(() => {
    listProductosMock.mockReset();
    insertProductoMock.mockReset();
    updateProductoMock.mockReset();
    deleteProductoMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("adds a product and shows success toast", async () => {
    const user = userEvent.setup();

    listProductosMock.mockResolvedValueOnce({ data: [], error: null });
    insertProductoMock.mockResolvedValue({ data: { id: "p1" }, error: null });
    listProductosMock.mockResolvedValueOnce({ data: [], error: null });

    render(<ProductosTab negocioId="n1" />);

    // Wait until the tab finished initial load.
    await screen.findByText("Lista de productos");

    // Accordion trigger and submit share label; pick the trigger (first occurrence).
    const addButtons = screen.getAllByRole("button", { name: "Añadir producto" });
    await user.click(addButtons[0]!);
    await user.type(screen.getByLabelText("Nombre *"), "Yerba");
    const submit = screen
      .getAllByRole("button", { name: "Añadir producto" })
      .find((b) => b.getAttribute("type") === "submit");
    expect(submit).toBeTruthy();
    await user.click(submit!);

    expect(toastSuccess).toHaveBeenCalledWith("Producto añadido");
  });

  it("edits a product and shows success toast when clicking Listo", async () => {
    const user = userEvent.setup();

    listProductosMock.mockResolvedValue({
      data: [
        {
          id: "p1",
          negocio_id: "n1",
          nombre: "Agua",
          barcode: "1",
          precio_compra: 10,
          precio_venta: 20,
          stock_actual: 3,
          activo: true,
          created_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    updateProductoMock.mockResolvedValue({ data: { id: "p1" }, error: null });

    render(<ProductosTab negocioId="n1" />);

    // Open mobile row accordion (we can't rely on viewport, so click trigger by name)
    await user.click(await screen.findByRole("button", { name: "Agua" }));
    const region = screen
      .getAllByRole("region")
      .find((r) => r.textContent?.includes("Código de barras"));
    expect(region).toBeTruthy();
    await user.click(within(region!).getByRole("button", { name: "Modificar" }));
    await user.click(within(region!).getByRole("button", { name: "Listo" }));

    expect(toastSuccess).toHaveBeenCalledWith("Producto guardado");
  });
});

