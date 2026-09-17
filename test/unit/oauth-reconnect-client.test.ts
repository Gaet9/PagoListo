import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MERCADOPAGO_OAUTH_UNLINK_API_PATH } from "@/lib/mercadopago/oauth-unlink-endpoint";
import { beginMercadoPagoConnectAnotherAccount } from "@/lib/mercadopago/oauth-reconnect-client";

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

    it("fail-closed si unlink falla y no navega", async () => {
        globalThis.fetch = vi.fn(async (): Promise<Response> => {
            return new Response(JSON.stringify({ error: "falló" }), { status: 500 });
        }) as typeof fetch;

        const result = await beginMercadoPagoConnectAnotherAccount("n1", "/perfil");

        expect(result).toEqual({ ok: false, message: "falló" });
        expect(window.location.href).toBe("");
    });

    it("unlink ok, limpia storage y navega a start con reconnect=1", async () => {
        sessionStorage.setItem("pagolisto:forgot-password-sent", "1");

        globalThis.fetch = vi.fn(async (input): Promise<Response> => {
            const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
            if (url.includes(MERCADOPAGO_OAUTH_UNLINK_API_PATH)) {
                return new Response(JSON.stringify({ ok: true }), { status: 200 });
            }
            throw new Error(`unexpected fetch ${url}`);
        }) as typeof fetch;

        const result = await beginMercadoPagoConnectAnotherAccount("n1", "/perfil");

        expect(result).toEqual({ ok: true });
        expect(window.location.href).toContain("reconnect=1");
        expect(window.location.href).toContain("negocioId=n1");
        expect(window.location.href).toContain("redirectTo=%2Fperfil");
        expect(sessionStorage.getItem("pagolisto:forgot-password-sent")).toBe("1");
    });
});
