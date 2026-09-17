import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
            const url =
                typeof input === "string" ? input
                : input instanceof URL ? input.toString()
                : input.url;
            if (url.includes("/api/mercadopago/oauth/status")) {
                return new Response(JSON.stringify({ connected: false }), { status: 200, headers: { "Content-Type": "application/json" } });
            }
            if (typeof originalFetch === "function") return originalFetch(input);
            return new Response("not found", { status: 404 });
        });

        globalThis.fetch = fetchMock as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        window.history.replaceState({}, "", "/");
    });

    it("renders tabs and switches to Cobrar", async () => {
        const user = userEvent.setup();
        render(<TiendaDashboard initialNegocios={[{ id: "n1", nombre: "Mi negocio", localizacion: null }]} />);

        expect(screen.getByRole("button", { name: "Cobrar" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Productos" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Cobrar" }));
        expect(screen.getByRole("heading", { name: "Cobrar" })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Compras" }));
        expect(screen.getByRole("heading", { name: "Mis compras" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Registrar nueva compra/i })).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Productos" }));
        expect(screen.getByRole("heading", { name: "Productos" })).toBeInTheDocument();
        // La pestaña Compras sigue montada (oculta) para no perder estado al volver.
        expect(screen.getByRole("heading", { name: "Mis compras", hidden: true })).toBeInTheDocument();
    });

    it("monta Configuración y muestra el estado de Mercado Pago", async () => {
        const user = userEvent.setup();
        render(<TiendaDashboard initialNegocios={[{ id: "n1", nombre: "Mi negocio", localizacion: null }]} />);

        await user.click(screen.getByRole("button", { name: "Configuración" }));
        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Configuración" })).toBeInTheDocument();
        });
        expect(screen.getByRole("button", { name: /^Vincular$/i })).toBeInTheDocument();
    });

    it("abre Configuración cuando la URL trae ?tab=configuracion", async () => {
        window.history.pushState({}, "", "/?tab=configuracion");
        render(<TiendaDashboard initialNegocios={[{ id: "n1", nombre: "Mi negocio", localizacion: null }]} />);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Configuración" })).toBeInTheDocument();
        });
    });

    it("monta Ventas al visitarla y mantiene Productos montado al cambiar de pestaña", async () => {
        const user = userEvent.setup();
        render(<TiendaDashboard initialNegocios={[{ id: "n1", nombre: "Mi negocio", localizacion: null }]} />);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Productos" })).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Ventas" }));
        await waitFor(() => {
            expect(screen.getByText("No hay ventas registradas.")).toBeInTheDocument();
        });

        expect(screen.getByRole("heading", { name: "Productos", hidden: true })).toBeInTheDocument();
    });

    it("usa initialNegocioId cuando hay varios negocios", () => {
        render(
            <TiendaDashboard
                initialNegocios={[
                    { id: "n1", nombre: "Primero", localizacion: null },
                    { id: "n2", nombre: "Segundo", localizacion: "CABA" },
                ]}
                initialNegocioId='n2'
            />,
        );

        expect(screen.getByRole("heading", { level: 1, name: "Segundo" })).toBeInTheDocument();
        const select = screen.getByRole("combobox", { name: /Negocio activo/i });
        expect(select).toHaveValue("n2");
    });
});
