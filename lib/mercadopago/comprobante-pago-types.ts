/**
 * Superficie del PDF (revisión seguridad): solo negocio, monto y referencia MP.
 * Sin tokens, PII del pagador ni UUIDs internos.
 */
export type ComprobantePagoData = {
    negocioNombre: string;
    montoArs: number;
    referenciaPago: string;
};

/** Respuesta pública del API: mismos campos que el PDF. */
export type ComprobantePagoApiResponse = {
    negocio_nombre: string;
    monto_ars: number;
    referencia_pago: string;
};

export function comprobantePagoFromApi(data: ComprobantePagoApiResponse): ComprobantePagoData {
    return {
        negocioNombre: data.negocio_nombre,
        montoArs: data.monto_ars,
        referenciaPago: data.referencia_pago,
    };
}
