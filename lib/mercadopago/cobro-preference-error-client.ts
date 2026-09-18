/** Mensajes cortos ES-AR para errores al crear preferencia de cobro (solo UI). */
export function mercadoPagoCobroPreferenceErrorMessage(status: number, bodyError?: string): string {
    if (status === 401) {
        return "Sesión vencida. Volvé a entrar.";
    }
    if (status === 404) {
        return "Tienda no encontrada.";
    }
    if (status === 409) {
        return "Mercado Pago no está vinculado.";
    }
    if (status === 400) {
        const trimmed = bodyError?.trim();
        if (
            trimmed &&
            !/^expected a non-empty items array$/i.test(trimmed) &&
            !/^el carrito debe tener al menos un producto$/i.test(trimmed) &&
            !/^invalid json body$/i.test(trimmed)
        ) {
            return trimmed;
        }
        return "Revisá los productos del carrito.";
    }
    if (status === 401 || status === 403) {
        const trimmed = bodyError?.trim();
        if (trimmed && trimmed.length <= 200) return trimmed;
        return "La conexión con Mercado Pago falló. Desvinculá y volvé a vincular en Configuración.";
    }
    if (status === 502 || status >= 500) {
        return "No pudimos generar el QR. Reintentá.";
    }
    const trimmed = bodyError?.trim();
    if (trimmed) {
        if (/not connected/i.test(trimmed)) return "Mercado Pago no está vinculado.";
        if (/init_point/i.test(trimmed)) return "No pudimos generar el QR. Reintentá.";
        return trimmed.length > 100 ? "No pudimos generar el QR. Reintentá." : trimmed;
    }
    return "No pudimos generar el QR. Reintentá.";
}

export function mercadoPagoCobroPreferenceUnknownErrorMessage(raw: unknown): string {
    if (raw instanceof Error) {
        return mercadoPagoCobroPreferenceErrorMessage(502, raw.message);
    }
    return "No pudimos generar el QR. Reintentá.";
}
