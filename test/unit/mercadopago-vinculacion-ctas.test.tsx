import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { MercadoPagoVinculacionCtas } from "@/components/tienda/mercadopago-vinculacion-ctas";
import { MERCADOPAGO_OAUTH_UNLINK_API_PATH } from "@/lib/mercadopago/oauth-unlink-endpoint";

describe("MercadoPagoVinculacionCtas", () => {
    const originalLocation = window.location;
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.stubGlobal("location", { ...originalLocation, href: "" });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.unstubAllGlobals();
    });

    it("Vincular otra cuenta desvincula primero y navega a start con reconnect=1", async () => {
        globalThis.fetch = vi.fn(async (input): Promise<Response> => {
            const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
            if (url.includes(MERCADOPAGO_OAUTH_UNLINK_API_PATH)) {
                return new Response(JSON.stringify({ ok: true }), { status: 200 });
            }
            throw new Error(`unexpected fetch ${url}`);
        }) as typeof fetch;

        render(
            <MercadoPagoVinculacionCtas
                negocioId='n1'
                connected
                oauthReturnPath='/perfil'
                onConnect={() => {}}
                onUnlinked={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /Vincular otra cuenta/i }));

        await waitFor(() => {
            expect(window.location.href).toContain("reconnect=1");
        });
        expect(window.location.href).not.toContain("forceAccountSelect");
        expect(globalThis.fetch).toHaveBeenCalled();
    });

    it("muestra error si unlink falla y no navega", async () => {
        globalThis.fetch = vi.fn(async (): Promise<Response> => {
            return new Response(JSON.stringify({ error: "No se pudo desvincular" }), { status: 500 });
        }) as typeof fetch;

        render(
            <MercadoPagoVinculacionCtas
                negocioId='n1'
                connected
                oauthReturnPath='/perfil'
                onConnect={() => {}}
                onUnlinked={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /Vincular otra cuenta/i }));

        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent(/desvincular/i);
        });
        expect(window.location.href).toBe("");
    });
});
