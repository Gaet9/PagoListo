/**
 * Base URL del sitio (sin barra final). Requerida para `back_urls` y `notification_url` de Checkout Pro.
 *
 * Debe ser la URL **canónica** que Mercado Pago puede alcanzar sin redirecciones (p. ej. `https://www.pagolisto.com.ar`
 * si el apex redirige). Un `notification_url` en el apex que 301/302 a www suele hacer que el IPN/webhook nunca llegue a Vercel.
 */
export function getPublicSiteBaseUrl(): string {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!raw) {
        throw new Error("NEXT_PUBLIC_SITE_URL is not set. It is required for Mercado Pago Checkout Pro back_urls.");
    }
    return raw.replace(/\/$/, "");
}

export function buildCheckoutProBackUrls(baseUrl: string) {
    return {
        success: `${baseUrl}/mercadopago/retorno/exito`,
        pending: `${baseUrl}/mercadopago/retorno/pendiente`,
        failure: `${baseUrl}/mercadopago/retorno/error`,
    } as const;
}
