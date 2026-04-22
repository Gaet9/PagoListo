import { describe, expect, it } from "vitest";

import { buildCheckoutProBackUrls } from "@/lib/mercadopago/checkout-pro-urls";

describe("buildCheckoutProBackUrls", () => {
  it("appends estado paths under /mercadopago/retorno", () => {
    expect(buildCheckoutProBackUrls("https://example.com")).toEqual({
      success: "https://example.com/mercadopago/retorno/exito",
      pending: "https://example.com/mercadopago/retorno/pendiente",
      failure: "https://example.com/mercadopago/retorno/error",
    });
  });

  it("does not duplicate slashes when base has no trailing slash", () => {
    const u = buildCheckoutProBackUrls("https://app.test");
    expect(u.success.startsWith("https://app.test/mercadopago")).toBe(true);
  });
});
