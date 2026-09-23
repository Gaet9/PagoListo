import { describe, expect, it } from "vitest";

import {
    ComprobanteSinFechaError,
    comprobantePagoFromApi,
    resolveComprobanteFechaDisplay,
} from "@/lib/mercadopago/comprobante-pago-from-api";
import { comprobantePagoPdfRows } from "@/lib/mercadopago/build-comprobante-pago-pdf";

describe("comprobantePagoFromApi", () => {
    it("usa fecha_display cuando viene del API", () => {
        const data = comprobantePagoFromApi({
            negocio_nombre: "Kiosco",
            monto_ars: 10,
            referencia_pago: "1",
            fecha: "2026-09-18T17:22:00.000Z",
            fecha_display: "18/09/26 14:22",
        });
        expect(data.fechaDisplay).toBe("18/09/26 14:22");
    });

    it("deriva fecha desde ISO si falta fecha_display (regresión)", () => {
        const display = resolveComprobanteFechaDisplay({
            fecha: "2026-09-18T17:22:00.000Z",
            fecha_display: "",
        });
        expect(display).toMatch(/^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/);

        const data = comprobantePagoFromApi({
            negocio_nombre: "Kiosco",
            monto_ars: 10,
            referencia_pago: "1",
            fecha: "2026-09-18T17:22:00.000Z",
            fecha_display: "",
        });
        expect(data.fechaDisplay).toBe(display);
    });

    it("falla si no hay fecha ni fecha_display", () => {
        expect(() =>
            comprobantePagoFromApi({
                negocio_nombre: "Kiosco",
                monto_ars: 10,
                referencia_pago: "1",
                fecha: "",
                fecha_display: "",
            }),
        ).toThrow(ComprobanteSinFechaError);
    });

    it("mantiene fila Fecha en PDF aun con nombre de negocio largo", () => {
        const rows = comprobantePagoPdfRows({
            negocioNombre: "Un negocio con nombre muy largo que en el PDF anterior tapaba la fila de fecha",
            montoArs: 100,
            referenciaPago: "999",
            fechaDisplay: "18/09/26 14:22",
        });
        expect(rows.map(([label]) => label)).toEqual(["Negocio", "Fecha", "Importe", "Referencia de pago"]);
        expect(rows[1]).toEqual(["Fecha", "18/09/26 14:22"]);
    });
});
