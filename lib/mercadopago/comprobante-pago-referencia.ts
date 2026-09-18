type MpRow = {
    mp_payment_id: string | null;
    mp_preference_id: string | null;
} | null;

/**
 * Referencia pública de cobro MP para el comprobante.
 * No usa UUIDs internos (venta/intento); solo IDs de Mercado Pago o payment_id del retorno.
 */
export function resolveReferenciaPagoMercadoPago(
    mp: MpRow,
    paymentIdFromRetorno: string | null,
): string | null {
    const fromMp = mp?.mp_payment_id?.trim();
    if (fromMp) return fromMp;
    const fromUrl = paymentIdFromRetorno?.trim();
    if (fromUrl) return fromUrl;
    const pref = mp?.mp_preference_id?.trim();
    if (pref) return pref;
    return null;
}
