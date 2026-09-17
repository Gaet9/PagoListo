export type MercadoPagoOAuthStartPathOptions = {
    /** GAE-37: contrato con `/api/mercadopago/oauth/start` (`reconnect=1` → re-login MP; ver PR #29). */
    reconnect?: boolean;
};

/** Ruta same-site de retorno tras OAuth (pestaña / path actual con `tab` por defecto). */
export function resolveMercadoPagoOAuthReturnPath(fallback = "/tiendas?tab=configuracion"): string {
    if (typeof window === "undefined") return fallback;
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (!params.get("tab")) params.set("tab", "configuracion");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : `${pathname}?tab=configuracion`;
}

/**
 * Path del servidor que inicia OAuth (PKCE + state). Usar en el cliente con `window.location.href`.
 */
export function buildMercadoPagoOAuthStartPath(
    negocioId: string,
    redirectTo?: string,
    options?: MercadoPagoOAuthStartPathOptions,
): string {
    let target = redirectTo?.trim();
    if (!target) {
        target = typeof window !== "undefined" ? resolveMercadoPagoOAuthReturnPath() : "/tiendas?tab=configuracion";
    }
    const qs = new URLSearchParams({
        negocioId,
        redirectTo: target,
    });
    if (options?.reconnect) {
        qs.set("reconnect", "1");
    }
    return `/api/mercadopago/oauth/start?${qs.toString()}`;
}
