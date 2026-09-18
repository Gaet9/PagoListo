import { describe, expect, it } from "vitest";

import { cobroWebhookPaymentPreferenceMatchesIntento } from "@/lib/mercadopago/cobro-webhook-preference-match";

describe("cobroWebhookPaymentPreferenceMatchesIntento", () => {
  it("allows match when stored preference equals payment", () => {
    expect(cobroWebhookPaymentPreferenceMatchesIntento("pref-1", "pref-1")).toBe(true);
  });

  it("rejects mismatch when stored preference is set", () => {
    expect(cobroWebhookPaymentPreferenceMatchesIntento("pref-1", "pref-2")).toBe(false);
  });

  it("allows payment when intento preference not set yet (insert before MP update)", () => {
    expect(cobroWebhookPaymentPreferenceMatchesIntento(null, "pref-1")).toBe(true);
    expect(cobroWebhookPaymentPreferenceMatchesIntento("", "pref-1")).toBe(true);
  });
});
