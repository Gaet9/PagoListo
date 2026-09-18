import { describe, expect, it } from "vitest";

import {
    comprobantePagoPdfSafeFilename,
    formatComprobanteFechaAr,
    formatComprobanteMontoArs,
} from "@/lib/mercadopago/comprobante-pago-format";

describe("comprobante-pago-format", () => {
    it("formatea monto en pesos argentinos", () => {
        const formatted = formatComprobanteMontoArs(1234.5);
        expect(formatted).toContain("1.234");
        expect(formatted).toMatch(/\$/);
    });

    it("formatea fecha en español AR", () => {
        const text = formatComprobanteFechaAr("2026-03-15T15:30:00.000Z");
        expect(text.length).toBeGreaterThan(8);
    });

    it("sanitiza nombre de archivo PDF", () => {
        expect(comprobantePagoPdfSafeFilename("pay/123?x")).toBe("comprobante-pago-pay_123_x.pdf");
    });
});
