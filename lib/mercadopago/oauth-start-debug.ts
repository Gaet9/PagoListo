import {
  MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN,
  MERCADOPAGO_OAUTH_RECONNECT_QUERY_VALUE,
} from "@/lib/mercadopago/oauth-reconnect";

/** Non-secret response headers on oauth/start redirect (ops / support). */
export const MERCADOPAGO_OAUTH_START_DEBUG_HEADER_RECONNECT = "X-PagoListo-Mp-Oauth-Reconnect";

export const MERCADOPAGO_OAUTH_START_DEBUG_HEADER_AUTHORIZE_PROMPT = "X-PagoListo-Mp-Oauth-Authorize-Prompt";

export type MercadoPagoOAuthStartReconnectDebug = {
  reconnect: true;
  authorizePrompt: typeof MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN;
  authorizeHasPromptLogin: boolean;
};

export function buildMercadoPagoOAuthStartReconnectDebug(authorizeUrl: string): MercadoPagoOAuthStartReconnectDebug {
  const prompt = new URL(authorizeUrl).searchParams.get("prompt");
  return {
    reconnect: true,
    authorizePrompt: MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN,
    authorizeHasPromptLogin: prompt === MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN,
  };
}

export function mercadoPagoOAuthStartReconnectDebugHeaders(): Record<string, string> {
  return {
    [MERCADOPAGO_OAUTH_START_DEBUG_HEADER_RECONNECT]: MERCADOPAGO_OAUTH_RECONNECT_QUERY_VALUE,
    [MERCADOPAGO_OAUTH_START_DEBUG_HEADER_AUTHORIZE_PROMPT]: MERCADOPAGO_OAUTH_AUTHORIZE_PROMPT_LOGIN,
  };
}
