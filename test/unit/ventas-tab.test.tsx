import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VentasTab } from "@/components/tienda/ventas-tab";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const listVentasPageMock = vi.fn();
const listVentaItemsByVentaIdMock = vi.fn();

vi.mock("@/lib/queries/ventas", () => ({
  listVentasPage: (...args: unknown[]) => listVentasPageMock(...args),
  listVentaItemsByVentaId: (...args: unknown[]) =>
    listVentaItemsByVentaIdMock(...args),
}));

vi.mock("@/components/tienda/ventas-area-chart", () => ({
  VentasAreaChart: () => null,
}));

vi.mock("@/components/mercadopago/descargar-comprobante-pago-button", () => ({
  DescargarComprobantePagoButton: ({ ventaId }: { ventaId?: string }) => (
    <button type="button">Comprobante {ventaId}</button>
  ),
}));

describe("VentasTab", () => {
  beforeEach(() => {
    listVentasPageMock.mockReset();
    listVentaItemsByVentaIdMock.mockReset();
  });

  it("renders ventas as accordion and loads items when expanded", async () => {
    const user = userEvent.setup();
    listVentasPageMock.mockResolvedValue({
      data: [
        {
          id: "v1",
          negocio_id: "n1",
          usuario_id: "u1",
          total: 3000,
          metodo_pago: "cash",
          estado: "completed",
          created_at: new Date("2026-01-02T12:30:00.000Z").toISOString(),
        },
      ],
      error: null,
    });
    listVentaItemsByVentaIdMock.mockResolvedValue({
      data: [
        {
          id: "it1",
          venta_id: "v1",
          producto_id: "p1",
          cantidad: 2,
          precio_unitario: 1500,
          subtotal: 3000,
          productos: { nombre: "Coca Cola" },
        },
      ],
      error: null,
    });

    render(<VentasTab negocioId="n1" />);

    const trigger = await screen.findByRole("button", {
      name: /Venta .* \$?/i,
    });
    await user.click(trigger);

    expect(await screen.findByText("Coca Cola")).toBeInTheDocument();
    expect(screen.getByText(/2 ×/)).toBeInTheDocument();
  });

  it("muestra descarga de comprobante para ventas Mercado Pago", async () => {
    const user = userEvent.setup();
    listVentasPageMock.mockResolvedValue({
      data: [
        {
          id: "v-mp",
          negocio_id: "n1",
          usuario_id: "u1",
          total: 1500,
          metodo_pago: "mercado_pago",
          estado: "completed",
          created_at: new Date("2026-01-02T12:30:00.000Z").toISOString(),
        },
      ],
      error: null,
    });
    listVentaItemsByVentaIdMock.mockResolvedValue({ data: [], error: null });

    render(<VentasTab negocioId="n1" />);
    const trigger = await screen.findByRole("button", { name: /Venta/i });
    await user.click(trigger);

    expect(await screen.findByRole("button", { name: "Comprobante v-mp" })).toBeInTheDocument();
  });
});
