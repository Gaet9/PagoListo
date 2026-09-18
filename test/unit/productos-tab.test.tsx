/**
 * Smoke manual (Adriana / Charlie) — tip con Network abierto:
 * A tipear / B blur / C Enter / D Tab / E Escape → 0 PATCH productos (borrador UI OK).
 * F Listo → PATCH /rest/v1/productos 200.
 * «Persistir» = write Supabase, no el valor visible en el input.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
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

    await screen.findByText("Lista de productos");

    const addButtons = screen.getAllByRole("button", { name: "Añadir producto" });
    await user.click(addButtons[0]!);

    await user.type(screen.getByLabelText("Nombre *"), "Yerba");
    await user.type(screen.getByLabelText("Precio compra *"), "10");
    await user.type(screen.getByLabelText("Precio venta *"), "15");
    await user.type(screen.getByLabelText("Stock *"), "5");
    const submit = screen
      .getAllByRole("button", { name: "Añadir producto" })
      .find((b) => b.getAttribute("type") === "submit");
    await user.click(submit!);

    expect(toastSuccess).toHaveBeenCalledWith("Producto añadido");
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

    await screen.findByRole("region", { name: "Totales de productos" });

    await user.click(await screen.findByRole("button", { name: "Agua" }));
    const region = screen
      .getAllByRole("region")
      .find((r) => r.textContent?.includes("Código de barras"));
    await user.click(within(region!).getByRole("button", { name: "Modificar" }));
    await user.click(within(region!).getByRole("button", { name: "Listo" }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Producto guardado");
    });
    expect(updateProductoMock).toHaveBeenCalled();
  });

  it("steps A–E: no updateProducto on type, blur, Enter, or Tab; only Listo writes", async () => {
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

    await screen.findByRole("region", { name: "Totales de productos" });

    await user.click(await screen.findByRole("button", { name: "Agua" }));
    const region = screen
      .getAllByRole("region")
      .find((r) => r.textContent?.includes("Código de barras"));
    await user.click(within(region!).getByRole("button", { name: "Modificar" }));

    const ventaInput = within(region!).getByDisplayValue("20");
    await user.clear(ventaInput);
    await user.type(ventaInput, "99");
    expect(updateProductoMock).not.toHaveBeenCalled();

    fireEvent.blur(ventaInput);
    expect(updateProductoMock).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(updateProductoMock).not.toHaveBeenCalled();

    await user.tab();
    expect(updateProductoMock).not.toHaveBeenCalled();

    await user.click(within(region!).getByRole("button", { name: "Listo" }));
    await waitFor(() => {
      expect(updateProductoMock).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps footer totals unchanged while editing draft", async () => {
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

    render(<ProductosTab negocioId="n1" />);

    const totalsRegion = await screen.findByRole("region", {
      name: "Totales de productos",
    });
    expect(totalsRegion).toHaveTextContent("$ 20,00");

    await user.click(await screen.findByRole("button", { name: "Agua" }));
    const region = screen
      .getAllByRole("region")
      .find((r) => r.textContent?.includes("Código de barras"));
    await user.click(within(region!).getByRole("button", { name: "Modificar" }));

    const ventaInput = within(region!).getByDisplayValue("20");
    await user.clear(ventaInput);
    await user.type(ventaInput, "50");

    expect(totalsRegion).toHaveTextContent("$ 20,00");
    expect(totalsRegion).not.toHaveTextContent("$ 50,00");
  });

  it("Escape (step E) discards draft without updateProducto", async () => {
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

    render(<ProductosTab negocioId="n1" />);

    await screen.findByRole("region", { name: "Totales de productos" });
    const initialTotalsCalls = fetchProductosTotalsForNegocioMock.mock.calls.length;

    const modificarButtons = screen.getAllByRole("button", { name: "Modificar" });
    await user.click(modificarButtons[modificarButtons.length - 1]!);

    const ventaInputs = screen.getAllByDisplayValue("20");
    const ventaInput = ventaInputs[ventaInputs.length - 1] as HTMLInputElement;
    await user.clear(ventaInput);
    await user.type(ventaInput, "99");
    fireEvent.keyDown(ventaInput, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Listo" })).not.toBeInTheDocument();
    });
    expect(screen.queryByDisplayValue("99")).not.toBeInTheDocument();

    expect(updateProductoMock).not.toHaveBeenCalled();
    expect(fetchProductosTotalsForNegocioMock.mock.calls.length).toBe(initialTotalsCalls);
  });
});
