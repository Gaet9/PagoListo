/**
 * `GET /api/mercadopago/oauth/start?reconnect=1` — otra cuenta MP / re-login.
 * Servidor: disconnectNegocioMercadoPagoOAuth + authorize con `prompt=login` (best-effort).
 */

export const MERCADOPAGO_OAUTH_RECONNECT_QUERY_PARAM = "reconnect";

export const MERCADOPAGO_OAUTH_RECONNECT_QUERY_VALUE = "1";

/**
 * @deprecated #28 enviaba `forceAccountSelect=1`. Alias de `reconnect` (un release). Preferir `reconnect=1` (#30).
 */
export const MERCADOPAGO_OAUTH_FORCE_ACCOUNT_SELECT_QUERY_PARAM = "forceAccountSelect";

export const MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_PARAM = "prompt";

export const MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN = "login";

export function isMercadoPagoOAuthReconnectRequested(raw: string | null | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes";
}

/** Primary: `reconnect`. Legacy alias: `forceAccountSelect` (#28). */
export function isMercadoPagoOAuthStartReconnectMode(input: {
  reconnect: string | null | undefined;
  forceAccountSelect?: string | null | undefined;
}): boolean {
  return (
    isMercadoPagoOAuthReconnectRequested(input.reconnect) ||
    isMercadoPagoOAuthReconnectRequested(input.forceAccountSelect)
  );
}

export type MercadoPagoOAuthStartPathOptions = {
  reconnect?: boolean;
};
