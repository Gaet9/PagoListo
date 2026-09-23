/**
 * Superficie del PDF: negocio, monto, referencia MP y fecha del cobro (no PII del pagador).
 * Sin tokens ni UUIDs internos.
 */
export type ComprobantePagoData = {
    negocioNombre: string;
    montoArs: number;
    referenciaPago: string;
    /** Texto listo para PDF (misma regla que Ventas). */
    fechaDisplay: string;
};

/** Respuesta pública del API: mismos campos que el PDF. */
export type ComprobantePagoApiResponse = {
    negocio_nombre: string;
    monto_ars: number;
    referencia_pago: string;
    /** Fecha/hora del cobro en ISO 8601 (UTC), desde venta o intento MP. */
    fecha: string;
    /** Fecha/hora legible (dd/MM/yy HH:mm), alineada con la UI de Ventas. */
    fecha_display: string;
};

export { comprobantePagoFromApi, ComprobanteSinFechaError, resolveComprobanteFechaDisplay } from "@/lib/mercadopago/comprobante-pago-from-api";
