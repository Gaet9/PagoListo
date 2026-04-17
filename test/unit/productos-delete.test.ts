import { describe, it, expect, vi } from "vitest";

import { deleteProducto } from "@/lib/queries/productos";

type CountRow = { count: number | null; error: { message: string } | null };

function mockClient(opts: { compraItems?: number; ventaItems?: number; movimientos?: number; deleteError?: { message: string } | null }) {
    const { compraItems = 0, ventaItems = 0, movimientos = 0, deleteError = null } = opts;

    const countFor = (table: string): CountRow => {
        if (table === "compra_items") return { count: compraItems, error: null };
        if (table === "venta_items") return { count: ventaItems, error: null };
        if (table === "movimientos_stock") return { count: movimientos, error: null };
        return { count: 0, error: null };
    };

    return {
        from: vi.fn((table: string) => {
            if (table === "productos") {
                return {
                    delete: () => ({
                        eq: () => Promise.resolve({ data: null, error: deleteError }),
                    }),
                };
            }
            return {
                select: () => ({
                    eq: () => Promise.resolve(countFor(table)),
                }),
            };
        }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("deleteProducto", () => {
    it("no llama a delete si hay compra_items", async () => {
        const client = mockClient({ compraItems: 1 });
        const res = await deleteProducto(client, "p1");
        expect(res.error?.message).toMatch(/líneas en compras/i);
        expect(res.error?.message).toMatch(/Activo/i);
        expect(client.from).toHaveBeenCalledWith("compra_items");
        expect(client.from).not.toHaveBeenCalledWith("productos");
    });

    it("elimina el producto si no hay referencias", async () => {
        const client = mockClient({});
        const res = await deleteProducto(client, "p1");
        expect(res.error).toBeNull();
        expect(client.from).toHaveBeenCalledWith("productos");
    });
});
