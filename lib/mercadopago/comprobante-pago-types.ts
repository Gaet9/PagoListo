/** Datos mínimos para el comprobante de pago MP (no factura fiscal). */
export type ComprobantePagoData = {
    negocioNombre: string;
    montoArs: number;
    /** Fecha del cobro (ISO). */
    fechaIso: string;
    /** ID de pago MP u otra referencia visible para el cliente. */
    referenciaPago: string;
    ventaId?: string | null;
    intentoId?: string | null;
};

export type ComprobantePagoApiResponse = {
    negocio_nombre: string;
    monto_ars: number;
    fecha: string;
    referencia_pago: string;
    venta_id: string | null;
    intento_id: string | null;
};

export function comprobantePagoFromApi(data: ComprobantePagoApiResponse): ComprobantePagoData {
    return {
        negocioNombre: data.negocio_nombre,
        montoArs: data.monto_ars,
        fechaIso: data.fecha,
        referenciaPago: data.referencia_pago,
        ventaId: data.venta_id,
        intentoId: data.intento_id,
    };
}
