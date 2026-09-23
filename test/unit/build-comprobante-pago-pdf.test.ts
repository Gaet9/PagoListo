import { describe, expect, it } from "vitest";

import { comprobantePagoPdfRows } from "@/lib/mercadopago/build-comprobante-pago-pdf";

describe("comprobantePagoPdfRows", () => {
    it("incluye fila Fecha con valor formateado", () => {
        const rows = comprobantePagoPdfRows({
            negocioNombre: "Kiosco Test",
            montoArs: 100,
            referenciaPago: "12345",
            fechaDisplay: "18/09/26 14:22",
        });
        expect(rows).toContainEqual(["Fecha", "18/09/26 14:22"]);
    });
});
