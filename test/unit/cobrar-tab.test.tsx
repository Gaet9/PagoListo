import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";

import { CobrarTab } from "@/components/tienda/cobrar-tab";

const mpBannerReportsConnected = vi.hoisted(() => ({ value: true }));

const rpcMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }),
}));

const listProductosMock = vi.fn();
vi.mock("@/lib/queries/productos", () => ({
    listProductos: (...args: unknown[]) => listProductosMock(...args),
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

// Avoid invoking camera logic in unit tests
vi.mock("@/components/tienda/barcode-scanner-dialog", () => ({
    BarcodeScannerDialog: () => null,
}));

vi.mock("@/components/tienda/mercadopago-oauth-status-banner", () => ({
    MercadoPagoOAuthStatusBanner: ({
        onConnectionChange,
    }: {
        onConnectionChange?: (connected: boolean) => void;
    }) => {
        useEffect(() => {
            onConnectionChange?.(mpBannerReportsConnected.value);
        }, [onConnectionChange]);
        return null;
    },
}));

describe("CobrarTab", () => {
    beforeEach(() => {
        mpBannerReportsConnected.value = true;
        listProductosMock.mockReset();
        rpcMock.mockReset();
        toastSuccess.mockReset();
        toastError.mockReset();
        toastWarning.mockReset();
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

        render(<CobrarTab negocioId='n1' />);

        expect(listProductosMock).toHaveBeenCalledWith(expect.anything(), "n1", { soloActivos: true });

        const input = await screen.findByPlaceholderText("Nombre o código de barras…");
        await user.type(input, "coca");

        await user.click(await screen.findByRole("button", { name: /Coca Cola/i }));

        expect(toastSuccess).toHaveBeenCalledWith("Producto añadido");
        expect(screen.getByText("Total")).toBeInTheDocument();
        expect(screen.getAllByText(/\$?\s*150/).length).toBeGreaterThan(0);
    });

    it("no muestra sugerencias de productos inactivos aunque vengan en la lista", async () => {
        const user = userEvent.setup();
        listProductosMock.mockResolvedValue({
            data: [
                {
                    id: "p0",
                    negocio_id: "n1",
                    nombre: "Coca retirada",
                    barcode: null,
                    precio_compra: 1,
                    precio_venta: 2,
                    stock_actual: 0,
                    activo: false,
                    created_at: new Date().toISOString(),
                },
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

        render(<CobrarTab negocioId='n1' />);

        const input = await screen.findByPlaceholderText("Nombre o código de barras…");
        await user.type(input, "coca");

        expect(screen.queryByRole("button", { name: /Coca retirada/i })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Coca Cola/i })).toBeInTheDocument();
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

        render(<CobrarTab negocioId='n1' />);

        const input = await screen.findByPlaceholderText("Nombre o código de barras…");
        await user.type(input, "999");
        await user.click(screen.getByRole("button", { name: "Validar" }));

        expect(toastSuccess).toHaveBeenCalledWith("Producto añadido");
        expect(screen.getByText(/Pan/)).toBeInTheDocument();
    });

    it("muestra Validar cobro con Efectivo y llama solo al RPC (movimientos vía trigger en BD)", async () => {
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
        rpcMock.mockResolvedValue({ data: null, error: null });

        render(<CobrarTab negocioId='n1' />);

        const input = await screen.findByPlaceholderText("Nombre o código de barras…");
        await user.type(input, "999");
        await user.click(screen.getByRole("button", { name: "Validar" }));

        await user.click(screen.getByRole("button", { name: "Efectivo" }));
        expect(screen.getByRole("button", { name: "Validar cobro" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Validar cobro" }));
        expect(rpcMock).toHaveBeenCalledWith("create_venta_efectivo", {
            p_negocio_id: "n1",
            p_items: [{ producto_id: "p1", qty: 1 }],
        });
    });

    it("deshabilita Mercado Pago (QR) cuando la cuenta está desvinculada", async () => {
        mpBannerReportsConnected.value = false;
        listProductosMock.mockResolvedValue({ data: [], error: null });

        render(<CobrarTab negocioId='n1' />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Mercado Pago (QR)" })).toBeDisabled();
            expect(screen.getByText(/Mercado Pago está desvinculada/i)).toBeInTheDocument();
        });
    });
});
