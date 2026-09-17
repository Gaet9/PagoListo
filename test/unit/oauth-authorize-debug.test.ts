import { describe, expect, it } from "vitest";

import {
  getMercadoPagoOAuthAuthorizeRedirectDebug,
  mercadoPagoOAuthAuthorizeDebugHeaders,
} from "@/lib/mercadopago/oauth-authorize-debug";

describe("getMercadoPagoOAuthAuthorizeRedirectDebug", () => {
  it("primer vínculo: sin reconnect ni prompt", () => {
    const authorizeUrl =
      "https://auth.mercadopago.com/authorization?client_id=1&response_type=code&state=s";
    const debug = getMercadoPagoOAuthAuthorizeRedirectDebug({ reconnect: false, authorizeUrl });
    expect(debug).toEqual({
      reconnect: false,
      promptLoginApplied: false,
      logoutHopApplied: false,
    });
  });

  it("reconnect=1: marca prompt=login y sin logout hop documentado", () => {
    const authorizeUrl =
      "https://auth.mercadopago.com/authorization?client_id=1&response_type=code&state=s&prompt=login";
    const debug = getMercadoPagoOAuthAuthorizeRedirectDebug({ reconnect: true, authorizeUrl });
    expect(debug.promptLoginApplied).toBe(true);
    expect(debug.logoutHopApplied).toBe(false);
  });

  it("headers reflejan flags sin secretos", () => {
    const headers = mercadoPagoOAuthAuthorizeDebugHeaders({
      reconnect: true,
      promptLoginApplied: true,
      logoutHopApplied: false,
    });
    expect(headers["x-pagolisto-oauth-reconnect"]).toBe("1");
    expect(headers["x-pagolisto-oauth-prompt-login"]).toBe("1");
    expect(headers["x-pagolisto-oauth-logout-hop"]).toBe("0");
  });
});
