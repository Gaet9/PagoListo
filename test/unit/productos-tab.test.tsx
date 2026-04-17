import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductosTab } from "@/components/tienda/productos-tab";

const { recordProductoStockMovementMock } = vi.hoisted(() => ({
  recordProductoStockMovementMock: vi.fn().mockResolvedValue({ error: null }),
}));

const { insertCompraReposicionMock } = vi.hoisted(() => ({
  insertCompraReposicionMock: vi.fn().mockResolvedValue({ data: { compraId: "c1" }, error: null }),
}));

vi.mock("@/lib/queries/compras", () => ({
  insertCompraReposicion: (...args: unknown[]) => insertCompraReposicionMock(...args),
}));

vi.mock("@/lib/queries/movimientos-stock", () => ({
  recordProductoStockMovement: (...args: unknown[]) =>
    recordProductoStockMovementMock(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const listProductosPageMock = vi.fn();
const fetchProductosTotalsForNegocioMock = vi.fn();
const insertProductoMock = vi.fn();
const updateProductoMock = vi.fn();
const deleteProductoMock = vi.fn();

vi.mock("@/lib/queries/productos", () => ({
  listProductosPage: (...args: unknown[]) => listProductosPageMock(...args),
  fetchProductosTotalsForNegocio: (...args: unknown[]) =>
    fetchProductosTotalsForNegocioMock(...args),
  insertProducto: (...args: unknown[]) => insertProductoMock(...args),
  updateProducto: (...args: unknown[]) => updateProductoMock(...args),
  deleteProducto: (...args: unknown[]) => deleteProductoMock(...args),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastWarning = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
    warning: (...args: unknown[]) => toastWarning(...args),
  },
}));

// avoid camera / zxing in unit tests
vi.mock("@/components/tienda/barcode-scanner-dialog", () => ({
  BarcodeScannerDialog: () => null,
}));

describe("ProductosTab", () => {
  beforeEach(() => {
    listProductosPageMock.mockReset();
    fetchProductosTotalsForNegocioMock.mockReset();
    insertProductoMock.mockReset();
    updateProductoMock.mockReset();
    deleteProductoMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    toastWarning.mockReset();
    recordProductoStockMovementMock.mockReset();
    recordProductoStockMovementMock.mockResolvedValue({ error: null });
    insertCompraReposicionMock.mockReset();
    insertCompraReposicionMock.mockResolvedValue({ data: { compraId: "c1" }, error: null });
    fetchProductosTotalsForNegocioMock.mockResolvedValue({
      data: {
        lineCount: 0,
        stockTotal: 0,
        sumPrecioCompra: 0,
        sumPrecioVenta: 0,
      },
      error: null,
    });
  });

  it("adds a product and shows success toast", async () => {
    const user = userEvent.setup();

    listProductosPageMock.mockResolvedValue({ data: [], error: null });
    insertProductoMock.mockResolvedValue({ data: { id: "p1" }, error: null });

    render(<ProductosTab negocioId="n1" />);

    // Wait until the tab finished initial load.
    await screen.findByText("Lista de productos");

    // Accordion trigger and submit share label; pick the trigger (first occurrence).
    const addButtons = screen.getAllByRole("button", { name: "Añadir producto" });
    await user.click(addButtons[0]!);

    expect(
      screen.getByRole("button", { name: "Escanear código de barras" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre *"), "Yerba");
    await user.type(screen.getByLabelText("Precio compra *"), "10");
    await user.type(screen.getByLabelText("Precio venta *"), "15");
    await user.type(screen.getByLabelText("Stock *"), "5");
    const submit = screen
      .getAllByRole("button", { name: "Añadir producto" })
      .find((b) => b.getAttribute("type") === "submit");
    expect(submit).toBeTruthy();
    await user.click(submit!);

    expect(toastSuccess).toHaveBeenCalledWith("Producto añadido");
    expect(insertCompraReposicionMock).toHaveBeenCalled();
  });

  it("edits a product and shows success toast when clicking Listo", async () => {
    const user = userEvent.setup();

    listProductosPageMock.mockResolvedValue({
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
    fetchProductosTotalsForNegocioMock.mockResolvedValue({
      data: {
        lineCount: 1,
        stockTotal: 3,
        sumPrecioCompra: 10,
        sumPrecioVenta: 20,
      },
      error: null,
    });
    updateProductoMock.mockResolvedValue({ data: { id: "p1" }, error: null });

    render(<ProductosTab negocioId="n1" />);

    const totalsRegion = await screen.findByRole("region", {
      name: "Totales de productos",
    });
    expect(totalsRegion).toHaveTextContent("Productos");
    expect(totalsRegion).toHaveTextContent("Stock");
    expect(totalsRegion).toHaveTextContent("3");
    expect(totalsRegion).toHaveTextContent("Total compra");
    expect(totalsRegion).toHaveTextContent("Total venta");

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

