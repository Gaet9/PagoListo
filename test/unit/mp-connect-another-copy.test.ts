import { describe, expect, it } from "vitest";

import { MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT } from "@/lib/mercadopago/mp-connect-another-copy";

describe("MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT", () => {
    it("menciona elegir otra cuenta y fallback ventana privada", () => {
        expect(MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT).toMatch(/otra cuenta/i);
        expect(MERCADOPAGO_CONNECT_ANOTHER_ACCOUNT_HINT).toMatch(/ventana privada/i);
    });
});
