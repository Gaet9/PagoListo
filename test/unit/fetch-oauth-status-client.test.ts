import { describe, expect, it, vi, afterEach } from "vitest";

import {
    fetchMercadoPagoOAuthStatus,
    mercadoPagoOAuthStatusErrorMessage,
} from "@/lib/mercadopago/fetch-oauth-status-client";

describe("fetchMercadoPagoOAuthStatus", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("mapea 401 a mensaje en español", () => {
        expect(mercadoPagoOAuthStatusErrorMessage(401)).toMatch(/sesión/i);
    });

    it("devuelve status cuando la API responde ok", async () => {
        globalThis.fetch = vi.fn(async () => {
            return new Response(JSON.stringify({ connected: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }) as typeof fetch;

        const result = await fetchMercadoPagoOAuthStatus("n1");
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.status.connected).toBe(false);
    });
});
