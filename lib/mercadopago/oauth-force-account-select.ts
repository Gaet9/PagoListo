/**
 * Contrato `GET /api/mercadopago/oauth/start` — complemento server de UX #28 (Fran).
 *
 * UI: unlink → start con `forceAccountSelect=1`. El servidor solo añade `prompt=login`
 * al authorize MP (best-effort; no documentado por MP). Ver docs/mercadopago-oauth-ops.md.
 */

/** Query param en `/api/mercadopago/oauth/start`. Valor canónico: `1`. */
export const MERCADOPAGO_OAUTH_FORCE_ACCOUNT_SELECT_QUERY_PARAM = "forceAccountSelect";

export const MERCADOPAGO_OAUTH_FORCE_ACCOUNT_SELECT_QUERY_VALUE = "1";

/** Parámetro en `https://auth.mercadopago.com/authorization` (no oficial MP). */
export const MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_PARAM = "prompt";

export const MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN = "login";

export function isMercadoPagoOAuthForceAccountSelectRequested(raw: string | null | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes";
}
