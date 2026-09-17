import { describe, expect, it } from "vitest";

import {
  buildMercadoPagoOAuthBrowserLogoutRedirectUrl,
  MERCADOPAGO_OAUTH_DOCUMENTED_BROWSER_LOGOUT_URL,
  resolveMercadoPagoOAuthReconnectBrowserRedirect,
} from "@/lib/mercadopago/oauth-mp-browser-session";

describe("oauth-mp-browser-session", () => {
  it("no hay URL de logout documentada por MP", () => {
    expect(MERCADOPAGO_OAUTH_DOCUMENTED_BROWSER_LOGOUT_URL).toBeNull();
    expect(buildMercadoPagoOAuthBrowserLogoutRedirectUrl("https://auth.mercadopago.com/authorization?state=x")).toBeNull();
  });

  it("reconnect redirige directo al authorize si no hay logout", () => {
    const authorize = "https://auth.mercadopago.com/authorization?state=abc&prompt=login";
    expect(resolveMercadoPagoOAuthReconnectBrowserRedirect(authorize)).toBe(authorize);
  });
});
