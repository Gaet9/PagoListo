import { describe, expect, it } from "vitest";

import {
    MP_OAUTH_ERROR_CODE_PARAM,
    MP_OAUTH_FLASH_PARAM,
    mpOAuthErrorMessage,
    parseMpOAuthFlashFromSearchParams,
    stripMpOAuthFlashParams,
    withMpOAuthFlashOnUrl,
} from "@/lib/mercadopago/oauth-return";

describe("mercadopago oauth-return", () => {
    it("parsea éxito", () => {
        const params = new URLSearchParams("tab=configuracion&mp_oauth=ok");
        expect(parseMpOAuthFlashFromSearchParams(params)).toEqual({ kind: "ok" });
    });

    it("parsea error con mensaje en español", () => {
        const params = new URLSearchParams(`mp_oauth=error&${MP_OAUTH_ERROR_CODE_PARAM}=cancelado`);
        const flash = parseMpOAuthFlashFromSearchParams(params);
        expect(flash?.kind).toBe("error");
        if (flash?.kind === "error") {
            expect(flash.code).toBe("cancelado");
            expect(flash.message).toContain("No autorizaste");
        }
    });

    it("añade flash a URL", () => {
        const url = new URL("https://app.test/tiendas/foo?tab=configuracion");
        const next = withMpOAuthFlashOnUrl(url, { kind: "ok" });
        expect(next.searchParams.get(MP_OAUTH_FLASH_PARAM)).toBe("ok");
    });

    it("limpia parámetros flash", () => {
        const params = new URLSearchParams("tab=cobrar&mp_oauth=ok&mp_oauth_error=x");
        const cleaned = stripMpOAuthFlashParams(params);
        expect(cleaned.get("tab")).toBe("cobrar");
        expect(cleaned.get(MP_OAUTH_FLASH_PARAM)).toBeNull();
    });

    it("mensaje por defecto para código desconocido", () => {
        expect(mpOAuthErrorMessage("otro")).toContain("Configuración");
    });
});
