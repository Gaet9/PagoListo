import { describe, expect, it, vi, afterEach } from "vitest";

import { unlinkMercadoPagoOAuth } from "@/lib/mercadopago/unlink-oauth-client";

describe("unlinkMercadoPagoOAuth", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("marca notImplemented en 501", async () => {
        globalThis.fetch = vi.fn(async () => {
            return new Response(JSON.stringify({ code: "not_implemented", error: "x" }), { status: 501 });
        }) as typeof fetch;

        const result = await unlinkMercadoPagoOAuth("n1");
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.notImplemented).toBe(true);
            expect(result.message).toMatch(/Desvincular/i);
        }
    });
});
