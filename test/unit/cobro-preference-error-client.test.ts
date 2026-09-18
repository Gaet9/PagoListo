import { describe, expect, it } from "vitest";

import {
    mercadoPagoCobroPreferenceErrorMessage,
    mercadoPagoCobroPreferenceUnknownErrorMessage,
} from "@/lib/mercadopago/cobro-preference-error-client";

describe("mercadoPagoCobroPreferenceErrorMessage", () => {
    it("mapea 401 y 409 a mensajes cortos", () => {
        expect(mercadoPagoCobroPreferenceErrorMessage(401)).toMatch(/sesión/i);
        expect(mercadoPagoCobroPreferenceErrorMessage(409)).toMatch(/vinculad/i);
    });

    it("traduce mensajes técnicos en inglés del servidor", () => {
        expect(mercadoPagoCobroPreferenceErrorMessage(400, "Expected a non-empty items array")).toMatch(/carrito/i);
    });

    it("devuelve mensaje genérico para errores desconocidos", () => {
        expect(mercadoPagoCobroPreferenceUnknownErrorMessage(new Error("network"))).toMatch(/QR/i);
    });
});
