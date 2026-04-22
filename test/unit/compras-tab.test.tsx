import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ComprasTab } from "@/components/tienda/compras-tab";

const listProductosMock = vi.fn();
const listComprasByNegocioPageMock = vi.fn();
const listCompraItemsByCompraIdMock = vi.fn();
const insertProductoMock = vi.fn();
const insertCompraReposicionMock = vi.fn();
const uploadCompraComprobanteMock = vi.fn();
const getCompraComprobanteSignedUrlMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        auth: { getUser: () => getUserMock() },
    }),
}));

vi.mock("@/lib/queries/productos", () => ({
    listProductos: (...args: unknown[]) => listProductosMock(...args),
    insertProducto: (...args: unknown[]) => insertProductoMock(...args),
}));

vi.mock("@/lib/queries/compras", () => ({
    insertCompraReposicion: (...args: unknown[]) => insertCompraReposicionMock(...args),
    listComprasByNegocioPage: (...args: unknown[]) => listComprasByNegocioPageMock(...args),
    listCompraItemsByCompraId: (...args: unknown[]) => listCompraItemsByCompraIdMock(...args),
}));

vi.mock("@/lib/storage/compras-comprobantes", () => ({
    uploadCompraComprobante: (...args: unknown[]) => uploadCompraComprobanteMock(...args),
    getCompraComprobanteSignedUrl: (...args: unknown[]) => getCompraComprobanteSignedUrlMock(...args),
}));

vi.mock("@/components/tienda/barcode-scanner-dialog", () => ({
    BarcodeScannerDialog: () => null,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
    toast: {
        success: (...a: unknown[]) => toastSuccess(...a),
        error: (...a: unknown[]) => toastError(...a),
    },
}));

function compraRowMock(i: number) {
    return {
        id: `id-${i}`,
        created_at: new Date(Date.UTC(2026, 0, 31 - i, 12, 0, 0)).toISOString(),
        total: 1,
        notas: null,
        proveedor_nombre: `P${i}`,
        proveedor_ref: null,
        proveedor_cuit_cuil: null,
        comprobante_storage_path: null as string | null,
    };
}

describe("ComprasTab", () => {
    beforeEach(() => {
        listProductosMock.mockReset();
        listComprasByNegocioPageMock.mockReset();
        listCompraItemsByCompraIdMock.mockReset();
        insertProductoMock.mockReset();
        insertCompraReposicionMock.mockReset();
        uploadCompraComprobanteMock.mockReset();
        getCompraComprobanteSignedUrlMock.mockReset();
        getUserMock.mockReset();
        toastSuccess.mockReset();
        toastError.mockReset();

        getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
        listComprasByNegocioPageMock.mockResolvedValue({ data: [], error: null });
        listCompraItemsByCompraIdMock.mockResolvedValue({ data: [], error: null });
        getCompraComprobanteSignedUrlMock.mockResolvedValue({
            signedUrl: "https://example.com/signed",
            error: null,
        });
        listProductosMock.mockResolvedValue({
            data: [
                {
                    id: "p1",
                    negocio_id: "n1",
                    nombre: "Yerba",
                    barcode: "111",
                    precio_compra: 500,
                    precio_venta: 800,
                    stock_actual: 10,
                    activo: true,
                    created_at: new Date().toISOString(),
                },
            ],
            error: null,
        });
        insertCompraReposicionMock.mockResolvedValue({ data: { compraId: "c1" }, error: null });
        uploadCompraComprobanteMock.mockResolvedValue({ storagePath: null, error: null });
        insertProductoMock.mockImplementation(
            async (
                _c,
                input: {
                    nombre: string;
                    precio_compra: number;
                    precio_venta: number;
                    negocio_id: string;
                    barcode?: string | null;
                    stock_actual?: number;
                    activo?: boolean;
                },
            ) => ({
                data: {
                    id: "p99",
                    negocio_id: input.negocio_id,
                    nombre: input.nombre,
                    barcode: input.barcode ?? null,
                    precio_compra: input.precio_compra,
                    precio_venta: input.precio_venta,
                    stock_actual: input.stock_actual ?? 0,
                    activo: input.activo ?? true,
                    created_at: new Date().toISOString(),
                },
                error: null,
            }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    async function abrirFormularioNuevaCompra(user: ReturnType<typeof userEvent.setup>) {
        await screen.findByRole("heading", { name: "Mis compras" });
        await user.click(screen.getByRole("button", { name: /Registrar nueva compra/i }));
    }

    it("registra compra con proveedor y líneas", async () => {
        const user = userEvent.setup();
        render(<ComprasTab negocioId='n1' />);

        await abrirFormularioNuevaCompra(user);
        await screen.findByLabelText("Nombre del proveedor *");
        await user.type(screen.getByLabelText("Nombre del proveedor *"), "Distribuidora Sur");
        await user.type(screen.getByLabelText("Nº factura / remito / ref."), "FAC-001");

        const search = screen.getByPlaceholderText("Nombre o código de barras…");
        await user.type(search, "yer");
        await user.click(await screen.findByRole("button", { name: /Yerba/i }));

        await user.click(screen.getByRole("button", { name: "Registrar compra" }));

        expect(insertCompraReposicionMock).toHaveBeenCalledWith(
            expect.anything(),
            "n1",
            [{ producto_id: "p1", cantidad: 1, precio_unitario: 500 }],
            expect.objectContaining({
                proveedor_nombre: "Distribuidora Sur",
                proveedor_ref: "FAC-001",
                proveedor_cuit_cuil: null,
                comprobante_storage_path: null,
                usuario_id: "u1",
            }),
        );
        expect(toastSuccess).toHaveBeenCalledWith("Compra registrada");
        expect(uploadCompraComprobanteMock).not.toHaveBeenCalled();
    });

    it("crea producto manual y lo muestra en líneas de compra", async () => {
        const user = userEvent.setup();
        render(<ComprasTab negocioId='n1' />);

        await abrirFormularioNuevaCompra(user);
        await screen.findByPlaceholderText("Ej. Yerba nueva");
        await user.type(screen.getByLabelText("Nombre *"), "Galletitas nuevas");
        await user.type(screen.getByLabelText("Precio compra unit. *"), "120");
        await user.clear(screen.getByLabelText("Cantidad *"));
        await user.type(screen.getByLabelText("Cantidad *"), "2");

        await user.click(screen.getByRole("button", { name: "Agregar producto manual" }));

        expect(insertProductoMock).toHaveBeenCalled();
        expect(toastSuccess).toHaveBeenCalledWith("Producto creado y añadido a la compra");
        expect(await screen.findByText("Galletitas nuevas")).toBeInTheDocument();
    });

    it("muestra compras y permite descargar comprobante con URL firmada", async () => {
        const mockLocation = { href: "" };
        const mockWin = { closed: false, location: mockLocation, close: vi.fn() };
        const openSpy = vi.spyOn(window, "open").mockImplementation((url?: string | URL) => {
            if (String(url ?? "") === "about:blank") return mockWin as unknown as Window;
            return null;
        });
        listComprasByNegocioPageMock.mockResolvedValue({
            data: [
                {
                    id: "c1",
                    created_at: "2026-01-15T14:00:00.000Z",
                    total: 250,
                    notas: "Compra registrada desde la tienda",
                    proveedor_nombre: "Proveedor SA",
                    proveedor_ref: "FAC-9",
                    proveedor_cuit_cuil: null,
                    comprobante_storage_path: "u1/n1/doc.pdf",
                },
            ],
            error: null,
        });

        const user = userEvent.setup();
        render(<ComprasTab negocioId='n1' />);

        await screen.findByRole("button", { name: /Compra .*Proveedor SA/i });
        await user.click(screen.getByRole("button", { name: /Compra .*Proveedor SA/i }));
        await user.click(await screen.findByRole("button", { name: /Descargar comprobante/i }));

        expect(getCompraComprobanteSignedUrlMock).toHaveBeenCalledWith(expect.anything(), "u1/n1/doc.pdf");
        expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
        expect(mockLocation.href).toBe("https://example.com/signed");
        openSpy.mockRestore();
    });

    it("pide la segunda página de compras cuando el final del listado entra en vista", async () => {
        class MockIntersectionObserver implements IntersectionObserver {
            readonly root: Element | null = null;
            readonly rootMargin = "";
            readonly thresholds = [0];
            constructor(private readonly cb: IntersectionObserverCallback) {}
            observe(target: Element) {
                queueMicrotask(() => {
                    this.cb(
                        [
                            {
                                isIntersecting: true,
                                target,
                                intersectionRatio: 1,
                                boundingClientRect: {} as DOMRectReadOnly,
                                intersectionRect: {} as DOMRectReadOnly,
                                rootBounds: null,
                                isVisible: true,
                                time: 0,
                            } as IntersectionObserverEntry,
                        ],
                        this,
                    );
                });
            }
            disconnect() {}
            takeRecords() {
                return [];
            }
            unobserve() {}
        }
        vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

        const firstPage = Array.from({ length: 11 }, (_, i) => compraRowMock(i));
        const secondPage = [compraRowMock(10), compraRowMock(11)].map((r, j) => ({
            ...r,
            id: `id-extra-${j}`,
            proveedor_nombre: `Extra${j}`,
        }));
        listComprasByNegocioPageMock.mockResolvedValueOnce({ data: firstPage, error: null }).mockResolvedValueOnce({
            data: secondPage,
            error: null,
        });

        render(<ComprasTab negocioId='n1' />);

        expect(await screen.findByText(/P0/)).toBeInTheDocument();
        await waitFor(() => expect(listComprasByNegocioPageMock).toHaveBeenCalledTimes(2));
        expect(listComprasByNegocioPageMock).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            "n1",
            expect.objectContaining({
                limit: 10,
                cursor: { created_at: firstPage[9]!.created_at, id: "id-9" },
            }),
        );
        expect(await screen.findByText(/Extra0/)).toBeInTheDocument();
    });

    it("exige referencia o CUIT si falta ambos", async () => {
        const user = userEvent.setup();
        render(<ComprasTab negocioId='n1' />);

        await abrirFormularioNuevaCompra(user);
        await screen.findByLabelText("Nombre del proveedor *");
        await user.type(screen.getByLabelText("Nombre del proveedor *"), "Proveedor X");

        const search = screen.getByPlaceholderText("Nombre o código de barras…");
        await user.type(search, "yer");
        await user.click(await screen.findByRole("button", { name: /Yerba/i }));

        await user.click(screen.getByRole("button", { name: "Registrar compra" }));

        expect(toastError).toHaveBeenCalled();
        expect(insertCompraReposicionMock).not.toHaveBeenCalled();
    });
});
