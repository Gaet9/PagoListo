import { describe, expect, it } from "vitest";

import { resolveReferenciaPagoMercadoPago } from "@/lib/mercadopago/comprobante-pago-referencia";

describe("resolveReferenciaPagoMercadoPago", () => {
    it("prioriza mp_payment_id", () => {
        expect(
            resolveReferenciaPagoMercadoPago(
                { mp_payment_id: "pay-1", mp_preference_id: "pref-1" },
                "url-pay",
            ),
        ).toBe("pay-1");
    });

    it("usa payment_id del retorno si no hay fila MP", () => {
        expect(resolveReferenciaPagoMercadoPago(null, "url-pay")).toBe("url-pay");
    });

    it("no devuelve UUID interno si falta referencia MP", () => {
        expect(resolveReferenciaPagoMercadoPago(null, null)).toBeNull();
        expect(
            resolveReferenciaPagoMercadoPago({ mp_payment_id: null, mp_preference_id: null }, ""),
        ).toBeNull();
    });
});
