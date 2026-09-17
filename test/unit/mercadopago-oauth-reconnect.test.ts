import { describe, expect, it } from "vitest";

import {
  isMercadoPagoOAuthReconnectRequested,
  isMercadoPagoOAuthStartReconnectMode,
  MERCADOPAGO_OAUTH_RECONNECT_QUERY_PARAM,
  MERCADOPAGO_OAUTH_RECONNECT_QUERY_VALUE,
} from "@/lib/mercadopago/oauth-reconnect";

describe("reconnect=1 oauth/start contract", () => {
  it("param name and value", () => {
    expect(MERCADOPAGO_OAUTH_RECONNECT_QUERY_PARAM).toBe("reconnect");
    expect(MERCADOPAGO_OAUTH_RECONNECT_QUERY_VALUE).toBe("1");
  });

  it("parser", () => {
    expect(isMercadoPagoOAuthReconnectRequested("1")).toBe(true);
    expect(isMercadoPagoOAuthReconnectRequested(null)).toBe(false);
  });

  it("start reconnect mode: reconnect primary, forceAccountSelect legacy alias", () => {
    expect(isMercadoPagoOAuthStartReconnectMode({ reconnect: "1", forceAccountSelect: null })).toBe(true);
    expect(isMercadoPagoOAuthStartReconnectMode({ reconnect: null, forceAccountSelect: "1" })).toBe(true);
    expect(isMercadoPagoOAuthStartReconnectMode({ reconnect: null, forceAccountSelect: null })).toBe(false);
  });
});
