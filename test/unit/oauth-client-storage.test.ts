import { describe, expect, it } from "vitest";

import {
    MERCADOPAGO_OAUTH_CLIENT_STORAGE_KEYS,
    clearMercadoPagoOAuthClientStorage,
} from "@/lib/mercadopago/oauth-client-storage";

describe("clearMercadoPagoOAuthClientStorage", () => {
    it("no borra keys ajenas a MP cuando la lista está vacía", () => {
        sessionStorage.setItem("pagolisto:forgot-password-sent", "1");
        clearMercadoPagoOAuthClientStorage();
        expect(sessionStorage.getItem("pagolisto:forgot-password-sent")).toBe("1");
        expect(MERCADOPAGO_OAUTH_CLIENT_STORAGE_KEYS).toEqual([]);
    });
});
