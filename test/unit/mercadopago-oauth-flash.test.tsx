import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { MercadoPagoOAuthFlashBanner } from "@/components/tienda/mercadopago-oauth-flash";

describe("MercadoPagoOAuthFlashBanner", () => {
    const originalReplaceState = window.history.replaceState;

    beforeEach(() => {
        window.history.replaceState = vi.fn();
    });

    afterEach(() => {
        window.history.replaceState = originalReplaceState;
    });

    it("muestra éxito cuando mp_oauth=ok", () => {
        window.history.pushState({}, "", "/tiendas/foo?tab=configuracion&mp_oauth=ok");
        render(<MercadoPagoOAuthFlashBanner />);
        expect(screen.getByRole("status")).toHaveTextContent(/vinculado/i);
        expect(screen.getByRole("link", { name: /Ir a Cobrar/i })).toHaveAttribute("href", "?tab=cobrar");
    });

    it("muestra error recuperable", () => {
        window.history.pushState({}, "", "/tiendas/foo?mp_oauth=error&mp_oauth_error=cancelado");
        render(<MercadoPagoOAuthFlashBanner />);
        expect(screen.getByRole("alert")).toHaveTextContent(/No autorizaste/i);
    });
});
