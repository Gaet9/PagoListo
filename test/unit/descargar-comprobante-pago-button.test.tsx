import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DescargarComprobantePagoButton } from "@/components/mercadopago/descargar-comprobante-pago-button";

const fetchMock = vi.fn();
vi.mock("@/lib/mercadopago/fetch-comprobante-pago-client", () => ({
    fetchComprobantePago: (...args: unknown[]) => fetchMock(...args),
}));

const downloadMock = vi.fn();
vi.mock("@/lib/mercadopago/build-comprobante-pago-pdf", () => ({
    downloadComprobantePagoPdfFromApi: (...args: unknown[]) => downloadMock(...args),
}));

describe("DescargarComprobantePagoButton", () => {
    beforeEach(() => {
        fetchMock.mockReset();
        downloadMock.mockReset();
    });

    it("descarga PDF con datos del API", async () => {
        const user = userEvent.setup();
        fetchMock.mockResolvedValue({
            ok: true,
            comprobante: {
                negocio_nombre: "Kiosco",
                monto_ars: 500,
                referencia_pago: "mp-1",
                fecha: "2026-01-01T15:00:00.000Z",
                fecha_display: "01/01/26 12:00",
            },
        });

        render(<DescargarComprobantePagoButton ventaId="v1" />);
        await user.click(screen.getByRole("button", { name: /Descargar comprobante PDF/i }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith({ ventaId: "v1", intentoId: undefined, paymentId: undefined });
            expect(downloadMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    negocio_nombre: "Kiosco",
                    monto_ars: 500,
                    referencia_pago: "mp-1",
                    fecha_display: "01/01/26 12:00",
                }),
            );
        });
    });
});
