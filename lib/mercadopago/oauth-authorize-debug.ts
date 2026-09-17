import {
  MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN,
  MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_PARAM,
} from "@/lib/mercadopago/oauth-reconnect";
import { buildMercadoPagoOAuthBrowserLogoutRedirectUrl } from "@/lib/mercadopago/oauth-mp-browser-session";

export type MercadoPagoOAuthAuthorizeRedirectDebug = {
  reconnect: boolean;
  promptLoginApplied: boolean;
  logoutHopApplied: boolean;
};

/** Flags no secretos para logs / headers en oauth/start (Adriana / ops). */
export function getMercadoPagoOAuthAuthorizeRedirectDebug(
  input: { reconnect?: boolean; authorizeUrl: string },
): MercadoPagoOAuthAuthorizeRedirectDebug {
  const reconnect = input.reconnect === true;
  const promptLoginApplied =
    reconnect &&
    new URL(input.authorizeUrl).searchParams.get(MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_PARAM) ===
      MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN;
  const logoutHopApplied = reconnect && buildMercadoPagoOAuthBrowserLogoutRedirectUrl(input.authorizeUrl) !== null;
  return { reconnect, promptLoginApplied, logoutHopApplied };
}

export const MERCADOPAGO_OAUTH_DEBUG_HEADER_RECONNECT = "x-pagolisto-oauth-reconnect";
export const MERCADOPAGO_OAUTH_DEBUG_HEADER_PROMPT_LOGIN = "x-pagolisto-oauth-prompt-login";
export const MERCADOPAGO_OAUTH_DEBUG_HEADER_LOGOUT_HOP = "x-pagolisto-oauth-logout-hop";

export function mercadoPagoOAuthAuthorizeDebugHeaders(
  debug: MercadoPagoOAuthAuthorizeRedirectDebug,
): Record<string, string> {
  return {
    [MERCADOPAGO_OAUTH_DEBUG_HEADER_RECONNECT]: debug.reconnect ? "1" : "0",
    [MERCADOPAGO_OAUTH_DEBUG_HEADER_PROMPT_LOGIN]: debug.promptLoginApplied ? "1" : "0",
    [MERCADOPAGO_OAUTH_DEBUG_HEADER_LOGOUT_HOP]: debug.logoutHopApplied ? "1" : "0",
  };
}
