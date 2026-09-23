import { describe, expect, it } from "vitest";

import { comprobantePagoPdfRows } from "@/lib/mercadopago/build-comprobante-pago-pdf";
import {
    ComprobanteSinFechaError,
    comprobantePagoFromApi,
    resolveComprobanteFechaDisplay,
} from "@/lib/mercadopago/comprobante-pago-from-api";

/** Payload real observado en Network (Adriana, venta MP completada). */
const API_PAYLOAD_ADRIANA = {
    negocio_nombre: "Mi kiosco",
    monto_ars: 1500,
    referencia_pago: "123456789",
    fecha: "2026-09-18T17:22:00.000Z",
    fecha_display: "18/09/26 14:22",
};

describe("comprobantePagoFromApi (Ventas → PDF)", () => {
    it("mapea fecha_display del API a fechaDisplay para el PDF", () => {
        const data = comprobantePagoFromApi(API_PAYLOAD_ADRIANA);
        expect(data.fechaDisplay).toBe("18/09/26 14:22");
    });

    it("deriva fecha desde ISO si fecha_display viene vacío", () => {
        const display = resolveComprobanteFechaDisplay({
            fecha: API_PAYLOAD_ADRIANA.fecha,
            fecha_display: "",
        });
        expect(display).toMatch(/^\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
    });

    it("regresión: filas PDF incluyen Fecha con payload del API", () => {
        const rows = comprobantePagoPdfRows(comprobantePagoFromApi(API_PAYLOAD_ADRIANA));
        expect(rows.map(([label]) => label)).toEqual(["Negocio", "Fecha", "Importe", "Referencia de pago"]);
        expect(rows[1]).toEqual(["Fecha", "18/09/26 14:22"]);
    });

    it("falla si no hay fecha ni fecha_display", () => {
        expect(() =>
            comprobantePagoFromApi({
                ...API_PAYLOAD_ADRIANA,
                fecha: "",
                fecha_display: "",
            }),
        ).toThrow(ComprobanteSinFechaError);
    });
});
