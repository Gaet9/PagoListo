/**
 * `GET /api/mercadopago/oauth/start?reconnect=1` — legado / ops (no usar desde «Vincular otra cuenta» en UI).
 * Servidor: disconnect fail-closed + authorize con `prompt=login` (best-effort; MP suele ignorarlo).
 * Flujo producto (Fran): unlink (`strictRevoke`) → UI desvinculada → start sin `reconnect`. Ver `oauth-reconnect-client.ts`.
 */

export const MERCADOPAGO_OAUTH_RECONNECT_QUERY_PARAM = "reconnect";

export const MERCADOPAGO_OAUTH_RECONNECT_QUERY_VALUE = "1";

export const MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_PARAM = "prompt";

export const MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN = "login";

export function isMercadoPagoOAuthReconnectRequested(raw: string | null | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes";
}

export type MercadoPagoOAuthStartPathOptions = {
  reconnect?: boolean;
};

/** Evalúa fail-closed del path reconnect cuando había token almacenado. */
export function reconnectDisconnectBlockedByMpRevoke(input: {
  storedAccessToken: string | null | undefined;
  mpRevokeAttempted: boolean;
  mpRevokeOk: boolean;
}): boolean {
  const hadStoredToken =
    typeof input.storedAccessToken === "string" && input.storedAccessToken.trim().length > 0;
  if (!hadStoredToken) return false;
  return !input.mpRevokeAttempted || !input.mpRevokeOk;
}
