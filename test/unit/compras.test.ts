import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { insertCompraReposicion, listComprasByNegocioPage } from "@/lib/queries/compras";

describe("listComprasByNegocioPage", () => {
    it("primera página: limit en servidor es pageSize + 1", async () => {
        const limit = vi.fn().mockResolvedValue({ data: [], error: null });
        const orderId = vi.fn().mockReturnValue({ limit });
        const orderCreated = vi.fn().mockReturnValue({ order: orderId });
        const eq = vi.fn().mockReturnValue({ order: orderCreated });
        const select = vi.fn().mockReturnValue({ eq });
        const from = vi.fn().mockReturnValue({ select });
        const client = { from } as unknown as SupabaseClient;

        await listComprasByNegocioPage(client, "n1", { limit: 10, cursor: null });

        expect(from).toHaveBeenCalledWith("compras");
        expect(eq).toHaveBeenCalledWith("negocio_id", "n1");
        expect(orderCreated).toHaveBeenCalledWith("created_at", { ascending: false });
        expect(orderId).toHaveBeenCalledWith("id", { ascending: false });
        expect(limit).toHaveBeenCalledWith(11);
    });

    it("página siguiente: aplica filtro or con el cursor", async () => {
        const final = Promise.resolve({ data: [], error: null });
        const or = vi.fn().mockReturnValue(final);
        const limit = vi.fn().mockReturnValue({ or });
        const orderId = vi.fn().mockReturnValue({ limit });
        const orderCreated = vi.fn().mockReturnValue({ order: orderId });
        const eq = vi.fn().mockReturnValue({ order: orderCreated });
        const select = vi.fn().mockReturnValue({ eq });
        const from = vi.fn().mockReturnValue({ select });
        const client = { from } as unknown as SupabaseClient;

        const cursor = { created_at: "2026-01-10T12:00:00.000Z", id: "uuid-a" };
        await listComprasByNegocioPage(client, "n1", { limit: 10, cursor });

        expect(limit).toHaveBeenCalledWith(11);
        expect(or).toHaveBeenCalledWith(
            "created_at.lt.2026-01-10T12:00:00.000Z,and(created_at.eq.2026-01-10T12:00:00.000Z,id.lt.uuid-a)",
        );
    });
});

describe("insertCompraReposicion", () => {
    it("no inserta si no hay líneas", async () => {
        const from = vi.fn();
        const client = { from } as unknown as SupabaseClient;
        const r = await insertCompraReposicion(client, "n1", []);
        expect(r.error).toBeNull();
        expect(from).not.toHaveBeenCalled();
    });

    it("inserta cabecera y cada línea de compra", async () => {
        const single = vi.fn().mockResolvedValue({
            data: { id: "c1" },
            error: null,
        });
        const itemInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
        const from = vi.fn((table: string) => {
            if (table === "compras") {
                return {
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({ single }),
                    }),
                };
            }
            if (table === "compra_items") {
                return { insert: itemInsert };
            }
            return { insert: vi.fn() };
        });
        const client = { from } as unknown as SupabaseClient;

        const r = await insertCompraReposicion(
            client,
            "n1",
            [{ producto_id: "p1", cantidad: 3, precio_unitario: 10 }],
            { notas: "Test" },
        );

        expect(r.error).toBeNull();
        expect(r.data?.compraId).toBe("c1");
        expect(single).toHaveBeenCalled();
        expect(itemInsert).toHaveBeenCalledTimes(1);
        expect(itemInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                compra_id: "c1",
                producto_id: "p1",
                cantidad: 3,
                precio_unitario: 10,
                subtotal: 30,
            }),
        );
    });

    it("inserta cabecera con datos de proveedor y comprobante cuando vienen en opts", async () => {
        const single = vi.fn().mockResolvedValue({
            data: { id: "c2" },
            error: null,
        });
        const insertPayload = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({ single }),
        });
        const itemInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
        const from = vi.fn((table: string) => {
            if (table === "compras") {
                return { insert: insertPayload };
            }
            if (table === "compra_items") {
                return { insert: itemInsert };
            }
            return { insert: vi.fn() };
        });
        const client = { from } as unknown as SupabaseClient;

        const r = await insertCompraReposicion(
            client,
            "n1",
            [{ producto_id: "p1", cantidad: 1, precio_unitario: 12 }],
            {
                notas: "Compra manual",
                proveedor_nombre: "ACME",
                proveedor_ref: "R-1",
                proveedor_cuit_cuil: "20-12345678-9",
                comprobante_storage_path: "u1/n1/archivo.pdf",
            },
        );

        expect(r.error).toBeNull();
        expect(insertPayload).toHaveBeenCalledWith(
            expect.objectContaining({
                proveedor_nombre: "ACME",
                proveedor_ref: "R-1",
                proveedor_cuit_cuil: "20-12345678-9",
                comprobante_storage_path: "u1/n1/archivo.pdf",
            }),
        );
    });
});
