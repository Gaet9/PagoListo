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

    it("formatea fecha como ventas (dd/MM/yy HH:mm)", () => {
        const text = formatComprobanteFechaAr("2026-09-18T17:22:00.000Z");
        expect(text).toMatch(/^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    });

    it("sanitiza nombre de archivo PDF", () => {
        expect(comprobantePagoPdfSafeFilename("pay/123?x")).toBe("comprobante-pago-pay_123_x.pdf");
    });
});
