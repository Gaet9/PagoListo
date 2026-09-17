import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import { MercadoPagoVinculacionCtas } from "@/components/tienda/mercadopago-vinculacion-ctas";

describe("MercadoPagoVinculacionCtas", () => {
    const originalFetch = globalThis.fetch;
    const originalLocation = window.location;

    beforeEach(() => {
        vi.stubGlobal("location", { ...originalLocation, href: "" });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.unstubAllGlobals();
    });

    it("Vincular otra cuenta desvincula y abre OAuth con reconnect=1", async () => {
        globalThis.fetch = vi.fn(async (): Promise<Response> => {
            return new Response(JSON.stringify({}), { status: 200 });
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
    });
});
