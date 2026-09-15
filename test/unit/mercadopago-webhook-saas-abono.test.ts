import { describe, it, expect } from "vitest";

import {
  expectedTotalFromIntento,
  resolveSaasAbonoIntentoLookupId,
} from "@/lib/mercadopago/webhook-saas-abono";

describe("resolveSaasAbonoIntentoLookupId", () => {
  it("prefers metadata intento_id", () => {
    expect(
      resolveSaasAbonoIntentoLookupId({
        metadata: { intento_id: "a" },
        external_reference: "b",
      }),
    ).toBe("a");
  });

  it("falls back to external_reference", () => {
    expect(resolveSaasAbonoIntentoLookupId({ external_reference: "b" })).toBe("b");
  });
});

describe("expectedTotalFromIntento", () => {
  it("parses numeric strings", () => {
    expect(expectedTotalFromIntento("4999.5")).toBe(4999.5);
  });
});
