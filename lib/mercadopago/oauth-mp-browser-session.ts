/**
 * Sesión del navegador en Mercado Pago / Mercado Libre durante OAuth.
 *
 * Documentación MP:
 * - [Manage Access Token](https://www.mercadopago.com.ar/developers/en/docs/security/oauth/management) — revocación de autorización (tokens borrados en MP); **sin** URL de logout de vendedor para integradores.
 * - [Get Access Token / authorize](https://www.mercadopago.com.ar/developers/en/docs/security/oauth/creation) — parámetros de authorize documentados **sin** `prompt=login`.
 *
 * Auditoría del repo: no hay uso de URLs de logout MP/MELI. Lo único en `auth.mercadopago.com` es
 * `/authorization` (`lib/mercadopago/oauth.ts`). `components/logout-button.tsx` cierra sesión de **PagoListo** (Supabase), no de Mercado Pago.
 *
 * PagoListo no inventa hops de logout ni hacks cross-origin de cookies.
 */

/** URL de logout MP/MELI documentada para integradores OAuth — hoy ninguna. */
export const MERCADOPAGO_OAUTH_DOCUMENTED_BROWSER_LOGOUT_URL: null = null;

/**
 * Si MP documentara un logout con retorno, devolvería esa URL con `returnTo` apuntando al authorize.
 * Hoy siempre `null`: el reconnect depende de revoke server-side + `prompt=login` (best-effort).
 */
export function buildMercadoPagoOAuthBrowserLogoutRedirectUrl(_returnToAuthorizeUrl: string): string | null {
  void _returnToAuthorizeUrl;
  return MERCADOPAGO_OAUTH_DOCUMENTED_BROWSER_LOGOUT_URL;
}

/**
 * Tras disconnect en reconnect: authorize directo o hop de logout solo si MP lo documentara.
 */
export function resolveMercadoPagoOAuthReconnectBrowserRedirect(authorizeUrl: string): string {
  const logoutHop = buildMercadoPagoOAuthBrowserLogoutRedirectUrl(authorizeUrl);
  return logoutHop ?? authorizeUrl;
}
