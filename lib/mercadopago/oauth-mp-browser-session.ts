/**
 * Sesión del navegador en Mercado Pago / Mercado Libre durante OAuth.
 *
 * La documentación oficial de OAuth ([Manage Access Token](https://www.mercadopago.com.ar/developers/en/docs/security/oauth/management))
 * describe revocación vía API y eventos de cuenta, pero **no** publica una URL de logout de terceros
 * en `auth.mercadopago.com` ni un parámetro `prompt=login` en el authorize.
 *
 * PagoListo no usa URLs de logout no documentadas (evita hacks cross-origin / cookies).
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
