import type { ComprobantePagoApiResponse, ComprobantePagoData } from "@/lib/mercadopago/comprobante-pago-types";
import { formatVentaDateTimeAr } from "@/lib/utils/format-venta-datetime-ar";

export class ComprobanteSinFechaError extends Error {
    constructor() {
        super("COMPROBANTE_SIN_FECHA");
        this.name = "ComprobanteSinFechaError";
    }
}

/** Acepta respuesta cruda del API (snake_case) y resuelve fecha legible para el PDF. */
export function resolveComprobanteFechaDisplay(
    data: Pick<ComprobantePagoApiResponse, "fecha" | "fecha_display">,
): string | null {
    const display = data.fecha_display?.trim();
    if (display) return display;
    const iso = data.fecha?.trim();
    if (iso) return formatVentaDateTimeAr(iso);
    return null;
}

export function comprobantePagoFromApi(data: ComprobantePagoApiResponse): ComprobantePagoData {
    const fechaDisplay = resolveComprobanteFechaDisplay(data);
    if (!fechaDisplay) {
        throw new ComprobanteSinFechaError();
    }

    return {
        negocioNombre: data.negocio_nombre,
        montoArs: data.monto_ars,
        referenciaPago: data.referencia_pago,
        fechaDisplay,
    };
}
