import { describe, expect, it } from "vitest";

import { buildMercadoPagoOAuthStartPath } from "@/lib/mercadopago/oauth-start-url";

describe("buildMercadoPagoOAuthStartPath", () => {
    it("usa redirectTo explícito sin window", () => {
        const path = buildMercadoPagoOAuthStartPath("neg-1", "/perfil");
        expect(path).toContain("negocioId=neg-1");
        expect(path).toContain("redirectTo=%2Fperfil");
    });

    it("default sin redirectTo explícito usa tab configuracion", () => {
        const path = buildMercadoPagoOAuthStartPath("neg-2", "/tiendas?tab=configuracion");
        expect(path).toContain("redirectTo=%2Ftiendas%3Ftab%3Dconfiguracion");
    });
});
