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

    it("formatea fecha en español AR (Buenos Aires)", () => {
        // 15:30 UTC = 12:30 en Argentina (sin DST en marzo)
        const text = formatComprobanteFechaAr("2026-03-15T15:30:00.000Z");
        expect(text).toMatch(/15/);
        expect(text).toMatch(/03/);
        expect(text).toMatch(/2026/);
        expect(text).toMatch(/12:30/);
    });

    it("sanitiza nombre de archivo PDF", () => {
        expect(comprobantePagoPdfSafeFilename("pay/123?x")).toBe("comprobante-pago-pay_123_x.pdf");
    });
});
