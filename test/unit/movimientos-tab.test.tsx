import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MovimientosTab } from "@/components/tienda/movimientos-tab";

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({}),
}));

const listMovimientosStockPageMock = vi.fn();
const listMovimientosStockForChartMock = vi.fn();

vi.mock("@/lib/queries/movimientos-stock", () => ({
    MOVIMIENTOS_STOCK_PAGE_SIZE: 10,
    listMovimientosStockPage: (...args: unknown[]) => listMovimientosStockPageMock(...args),
    listMovimientosStockForChart: (...args: unknown[]) => listMovimientosStockForChartMock(...args),
}));

vi.mock("@/lib/queries/productos", () => ({
    listProductos: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

describe("MovimientosTab", () => {
    beforeEach(() => {
        listMovimientosStockPageMock.mockReset();
        listMovimientosStockForChartMock.mockReset();
        listMovimientosStockForChartMock.mockResolvedValue({ data: [], error: null });
    });

    it("muestra compra y venta con cantidad y ref corta", async () => {
        listMovimientosStockPageMock.mockResolvedValue({
            data: [
                {
                    id: "m1",
                    producto_id: "p1",
                    tipo: "out",
                    cantidad: 2,
                    created_at: "2026-01-10T15:00:00.000Z",
                    venta_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                    compra_id: null,
                    productos: { nombre: "Yerba" },
                },
                {
                    id: "m2",
                    producto_id: "p1",
                    tipo: "in",
                    cantidad: 24,
                    created_at: "2026-01-09T10:00:00.000Z",
                    venta_id: null,
                    compra_id: "11111111-2222-3333-4444-555555555555",
                    productos: { nombre: "Yerba" },
                },
            ],
            error: null,
        });

        render(<MovimientosTab negocioId='n1' />);

        expect((await screen.findAllByText("Yerba")).length).toBe(2);
        expect(screen.getAllByText("Venta").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Compra")).toBeInTheDocument();

        const table = screen.getByRole("table");
        expect(table.textContent).toContain("2");
        expect(table.textContent).toContain("24");
        expect(screen.getByRole("columnheader", { name: "Ref" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Restablecer búsqueda de la tabla" })).toBeDisabled();
    });

    it("en vista estrecha muestra acordeón sin tabla ni cabeceras", async () => {
        const spy = vi.spyOn(window, "matchMedia").mockImplementation((query: unknown) => {
            const q = String(query);
            return {
                matches: false,
                media: q,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            };
        });
        try {
            listMovimientosStockPageMock.mockResolvedValue({
                data: [
                    {
                        id: "m1",
                        producto_id: "p1",
                        tipo: "out",
                        cantidad: 2,
                        created_at: "2026-01-10T15:00:00.000Z",
                        venta_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                        compra_id: null,
                        productos: { nombre: "Yerba" },
                    },
                ],
                error: null,
            });

            const user = userEvent.setup();
            render(<MovimientosTab negocioId='n1' />);

            expect(await screen.findByText("Yerba")).toBeInTheDocument();
            expect(screen.queryByRole("table")).toBeNull();
            expect(screen.queryByRole("columnheader", { name: "Ref" })).toBeNull();
            await user.click(screen.getByRole("button", { name: /Más información/ }));
            expect(await screen.findByText("Mostrar en gráfico")).toBeInTheDocument();
        } finally {
            spy.mockRestore();
        }
    });
});
