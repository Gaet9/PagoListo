import { describe, expect, it } from "vitest";

import { formatComprobanteFechaAr } from "@/lib/mercadopago/comprobante-pago-format";
import { formatVentaDateTimeAr } from "@/lib/utils/format-venta-datetime-ar";

describe("formatVentaDateTimeAr", () => {
    it("usa dd/MM/yy y HH:mm como la lista de ventas", () => {
        const iso = "2026-09-18T17:22:00.000Z";
        const formatted = formatVentaDateTimeAr(iso);
        expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
        expect(formatComprobanteFechaAr(iso)).toBe(formatted);
    });
});
