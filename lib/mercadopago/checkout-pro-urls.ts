/** Base URL del sitio (sin barra final). Requerida para `back_urls` de Checkout Pro. */
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
