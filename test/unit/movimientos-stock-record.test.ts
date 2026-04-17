import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { recordProductoStockMovement } from "@/lib/queries/movimientos-stock";

describe("recordProductoStockMovement", () => {
    it("no llama a Supabase si el stock no cambia", async () => {
        const from = vi.fn();
        const client = { from } as unknown as SupabaseClient;
        await recordProductoStockMovement(client, "p1", 4, 4);
        expect(from).not.toHaveBeenCalled();
    });

    it("no inserta movimiento si sube el stock (entradas vía compra_items en BD)", async () => {
        const insert = vi.fn().mockResolvedValue({ data: {}, error: null });
        const from = vi.fn().mockReturnValue({ insert });
        const client = { from } as unknown as SupabaseClient;

        await recordProductoStockMovement(client, "p1", 2, 7);

        expect(from).not.toHaveBeenCalled();
        expect(insert).not.toHaveBeenCalled();
    });

    it("no inserta si sube el stock aunque se pasen opts de precio", async () => {
        const insert = vi.fn().mockResolvedValue({ data: {}, error: null });
        const from = vi.fn().mockReturnValue({ insert });
        const client = { from } as unknown as SupabaseClient;

        await recordProductoStockMovement(client, "p1", 0, 4, {
            precioCompra: 99.5,
            precioVenta: 150,
        });

        expect(from).not.toHaveBeenCalled();
    });

    it("inserta salida cuando baja el stock", async () => {
        const insert = vi.fn().mockResolvedValue({ data: {}, error: null });
        const from = vi.fn().mockReturnValue({ insert });
        const client = { from } as unknown as SupabaseClient;

        await recordProductoStockMovement(client, "p1", 10, 3);

        expect(from).toHaveBeenCalledWith("movimientos_stock");
        expect(insert).toHaveBeenCalledWith(
            expect.objectContaining({
                producto_id: "p1",
                tipo: "out",
                cantidad: 7,
                stock_anterior: 10,
                stock_nuevo: 3,
            }),
        );
    });
});
