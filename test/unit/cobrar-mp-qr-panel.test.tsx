import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CobrarMpQrPanel } from "@/components/tienda/cobrar-mp-qr-panel";

vi.mock("@/components/tienda/mercadopago-qr", () => ({
    MercadoPagoQr: () => <div data-testid='mp-qr'>QR</div>,
}));

const fetchOAuthMock = vi.fn();
vi.mock("@/lib/mercadopago/fetch-oauth-status-client", () => ({
    fetchMercadoPagoOAuthStatus: (...args: unknown[]) => fetchOAuthMock(...args),
}));

const createPrefMock = vi.fn();
vi.mock("@/lib/mercadopago/create-cobro-preference-client", () => ({
    createCobroPreferenceClient: (...args: unknown[]) => createPrefMock(...args),
}));

const fetchStatusMock = vi.fn();
vi.mock("@/lib/mercadopago/fetch-cobro-intento-status-client", () => ({
    fetchCobroIntentoStatus: (...args: unknown[]) => fetchStatusMock(...args),
}));

const removeChannel = vi.fn();
const subscribe = vi.fn(() => ({ unsubscribe: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        channel: () => ({
            on: () => ({ subscribe }),
        }),
        removeChannel,
    }),
}));

describe("CobrarMpQrPanel", () => {
    const onApproved = vi.fn();
    const onConnectionChange = vi.fn();

    beforeEach(() => {
        fetchOAuthMock.mockReset();
        createPrefMock.mockReset();
        fetchStatusMock.mockReset();
        onApproved.mockReset();
        onConnectionChange.mockReset();
        subscribe.mockClear();
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("muestra esperando pago y llama onPaymentApproved al aprobar por poll", async () => {
        fetchOAuthMock.mockResolvedValue({ ok: true, status: { connected: true } });
        createPrefMock.mockResolvedValue({
            ok: true,
            initPoint: "https://mp.test/pay",
            intentoId: "int-1",
        });
        fetchStatusMock.mockResolvedValue({
            ok: true,
            status: { approved: true, intento_id: "int-1", venta_id: "v1" },
        });

        render(
            <CobrarMpQrPanel
                negocioId='n1'
                cartFingerprint='p1:1'
                lines={[{ productoId: "p1", title: "Pan", qty: 1, unitPrice: 10 }]}
                oauthReturnPath='/tiendas?tab=cobrar'
                onMpConnectionChange={onConnectionChange}
                onPaymentApproved={onApproved}
            />,
        );

        expect(await screen.findByText(/Esperando pago del cliente/i)).toBeInTheDocument();
        expect(screen.getByTestId("mp-qr")).toBeInTheDocument();

        await waitFor(() => {
            expect(onApproved).toHaveBeenCalledTimes(1);
        });
    });

    it("muestra error corto y reintenta", async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        fetchOAuthMock.mockResolvedValue({ ok: true, status: { connected: true } });
        createPrefMock.mockResolvedValueOnce({ ok: false, message: "No pudimos generar el QR. Reintentá." });
        createPrefMock.mockResolvedValueOnce({
            ok: true,
            initPoint: "https://mp.test/pay",
            intentoId: "int-2",
        });
        fetchStatusMock.mockResolvedValue({ ok: true, status: { approved: false, intento_id: "int-2" } });

        render(
            <CobrarMpQrPanel
                negocioId='n1'
                cartFingerprint='p1:1'
                lines={[{ productoId: "p1", title: "Pan", qty: 1, unitPrice: 10 }]}
                oauthReturnPath='/tiendas?tab=cobrar'
                onMpConnectionChange={onConnectionChange}
                onPaymentApproved={onApproved}
            />,
        );

        expect(await screen.findByText(/No pudimos generar el QR/i)).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Reintentar" }));

        expect(await screen.findByText(/Esperando pago del cliente/i)).toBeInTheDocument();
    });
});
