import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MercadoPagoVinculacionCtas } from "@/components/tienda/mercadopago-vinculacion-ctas";

describe("MercadoPagoVinculacionCtas", () => {
    const originalLocation = window.location;

    beforeEach(() => {
        vi.stubGlobal("location", { ...originalLocation, href: "" });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("Vincular otra cuenta navega a start con reconnect=1", () => {
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

        expect(window.location.href).toContain("reconnect=1");
        expect(window.location.href).not.toContain("forceAccountSelect");
    });
});
