import { afterEach, describe, expect, it, vi } from "vitest";

import {
    fetchCobroIntentoStatus,
    mercadoPagoCobroIntentoStatusErrorMessage,
} from "@/lib/mercadopago/fetch-cobro-intento-status-client";

describe("fetchCobroIntentoStatus", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("mapea 403 a mensaje corto", () => {
        expect(mercadoPagoCobroIntentoStatusErrorMessage(403)).toMatch(/consultar/i);
    });

    it("devuelve approved cuando la API responde ok", async () => {
        globalThis.fetch = vi.fn(async () => {
            return new Response(
                JSON.stringify({
                    intento_id: "i1",
                    venta_id: "v1",
                    approved: true,
                    consumed_at: null,
                    created_at: new Date().toISOString(),
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }) as typeof fetch;

        const result = await fetchCobroIntentoStatus("i1");
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.status.approved).toBe(true);
    });
});
