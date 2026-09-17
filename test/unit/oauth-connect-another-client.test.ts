import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { beginMercadoPagoConnectAnotherAccount } from "@/lib/mercadopago/oauth-connect-another-client";

describe("beginMercadoPagoConnectAnotherAccount", () => {
    const originalFetch = globalThis.fetch;
    const originalLocation = window.location;

    beforeEach(() => {
        vi.stubGlobal("location", { ...originalLocation, href: "" });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.unstubAllGlobals();
    });

    it("desvincula y navega a start con reconnect=1", async () => {
        globalThis.fetch = vi.fn(async (): Promise<Response> => {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }) as typeof fetch;

        const result = await beginMercadoPagoConnectAnotherAccount("neg-1", "/tiendas?tab=cobrar");

        expect(result).toEqual({ ok: true });
        expect(globalThis.fetch).toHaveBeenCalledWith(
            "/api/mercadopago/oauth/unlink",
            expect.objectContaining({ method: "POST" }),
        );
        expect(window.location.href).toContain("/api/mercadopago/oauth/start");
        expect(window.location.href).toContain("negocioId=neg-1");
        expect(window.location.href).toContain("reconnect=1");
        expect(window.location.href).toContain("redirectTo=%2Ftiendas%3Ftab%3Dcobrar");
    });

    it("no navega si falla unlink", async () => {
        globalThis.fetch = vi.fn(async (): Promise<Response> => {
            return new Response(JSON.stringify({ error: "fail" }), { status: 500 });
        }) as typeof fetch;

        const result = await beginMercadoPagoConnectAnotherAccount("neg-1", "/perfil");

        expect(result.ok).toBe(false);
        expect(window.location.href).toBe("");
    });
});
