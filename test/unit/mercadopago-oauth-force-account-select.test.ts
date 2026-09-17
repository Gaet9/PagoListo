import { describe, expect, it } from "vitest";

import {
  isMercadoPagoOAuthForceAccountSelectRequested,
  MERCADOPAGO_OAUTH_FORCE_ACCOUNT_SELECT_QUERY_PARAM,
  MERCADOPAGO_OAUTH_FORCE_ACCOUNT_SELECT_QUERY_VALUE,
} from "@/lib/mercadopago/oauth-force-account-select";

describe("forceAccountSelect query contract (#28 UX)", () => {
  it("param name and canonical value", () => {
    expect(MERCADOPAGO_OAUTH_FORCE_ACCOUNT_SELECT_QUERY_PARAM).toBe("forceAccountSelect");
    expect(MERCADOPAGO_OAUTH_FORCE_ACCOUNT_SELECT_QUERY_VALUE).toBe("1");
  });

  it("parser accepts 1, true, yes", () => {
    expect(isMercadoPagoOAuthForceAccountSelectRequested("1")).toBe(true);
    expect(isMercadoPagoOAuthForceAccountSelectRequested("true")).toBe(true);
    expect(isMercadoPagoOAuthForceAccountSelectRequested("yes")).toBe(true);
    expect(isMercadoPagoOAuthForceAccountSelectRequested(null)).toBe(false);
    expect(isMercadoPagoOAuthForceAccountSelectRequested("0")).toBe(false);
  });
});
