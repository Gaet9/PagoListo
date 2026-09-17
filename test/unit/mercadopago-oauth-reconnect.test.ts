import { describe, expect, it } from "vitest";

import {
  isMercadoPagoOAuthReconnectRequested,
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
});
