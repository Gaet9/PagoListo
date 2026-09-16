import { describe, expect, it } from "vitest";

import {
    buildOAuthCallbackErrorRedirect,
    buildOAuthCallbackRedirect,
    resolveSafeRedirect,
} from "@/lib/mercadopago/oauth-callback-redirect";
import { MP_OAUTH_FLASH_PARAM } from "@/lib/mercadopago/oauth-return";

describe("mercadopago oauth-callback-redirect", () => {
    const origin = "https://pagolisto.test";

    it("resuelve redirect relativo", () => {
        const u = resolveSafeRedirect(origin, "/tiendas/kiosco?tab=cobrar");
        expect(u.pathname).toBe("/tiendas/kiosco");
        expect(u.searchParams.get("tab")).toBe("cobrar");
    });

    it("rechaza redirect externo", () => {
        const u = resolveSafeRedirect(origin, "https://evil.test/phish");
        expect(u.pathname).toBe("/tiendas");
    });

    it("éxito añade mp_oauth=ok", () => {
        const u = buildOAuthCallbackRedirect(origin, "/perfil", { kind: "ok" });
        expect(u.searchParams.get(MP_OAUTH_FLASH_PARAM)).toBe("ok");
        expect(u.pathname).toBe("/perfil");
    });

    it("error añade código", () => {
        const u = buildOAuthCallbackErrorRedirect(origin, null, "estado_expirado");
        expect(u.searchParams.get(MP_OAUTH_FLASH_PARAM)).toBe("error");
        expect(u.searchParams.get("mp_oauth_error")).toBe("estado_expirado");
        expect(u.pathname).toBe("/tiendas");
    });
});
