import { describe, expect, it } from "vitest";

import {
  isMercadoPagoOAuthReconnectRequested,
  MERCADOPAGO_OAUTH_RECONNECT_QUERY_PARAM,
  MERCADOPAGO_OAUTH_RECONNECT_QUERY_VALUE,
  reconnectDisconnectBlockedByMpRevoke,
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

describe("reconnectDisconnectBlockedByMpRevoke", () => {
  it("no bloquea si no había access_token", () => {
    expect(
      reconnectDisconnectBlockedByMpRevoke({
        storedAccessToken: null,
        mpRevokeAttempted: false,
        mpRevokeOk: false,
      }),
    ).toBe(false);
  });

  it("bloquea si había token y revoke falló", () => {
    expect(
      reconnectDisconnectBlockedByMpRevoke({
        storedAccessToken: "APP_USR-xxx",
        mpRevokeAttempted: true,
        mpRevokeOk: false,
      }),
    ).toBe(true);
  });

  it("no bloquea si había token y revoke OK", () => {
    expect(
      reconnectDisconnectBlockedByMpRevoke({
        storedAccessToken: "APP_USR-xxx",
        mpRevokeAttempted: true,
        mpRevokeOk: true,
      }),
    ).toBe(false);
  });
});
