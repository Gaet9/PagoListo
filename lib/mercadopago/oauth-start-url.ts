/**
 * Path del servidor que inicia OAuth (PKCE + state). Usar en el cliente con `window.location.href`.
 */
export function buildMercadoPagoOAuthStartPath(negocioId: string, redirectTo?: string): string {
    let target = redirectTo?.trim();
    if (!target && typeof window !== "undefined") {
        const pathname = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        if (!params.get("tab")) params.set("tab", "configuracion");
        const qs = params.toString();
        target = qs ? `${pathname}?${qs}` : `${pathname}?tab=configuracion`;
    }
    if (!target) {
        target = "/tiendas?tab=configuracion";
    }
    return `/api/mercadopago/oauth/start?negocioId=${encodeURIComponent(negocioId)}&redirectTo=${encodeURIComponent(target)}`;
}
