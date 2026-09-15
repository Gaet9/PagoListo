import { describe, expect, it } from "vitest";

import { mercadoPagoAmountsMatch } from "@/lib/mercadopago/cobro-amount";

describe("mercadoPagoAmountsMatch", () => {
  it("matches equal amounts", () => {
    expect(mercadoPagoAmountsMatch(1500.5, 1500.5)).toBe(true);
  });

  it("allows one cent tolerance", () => {
    expect(mercadoPagoAmountsMatch(100, 100.005)).toBe(true);
  });

  it("rejects meaningful drift", () => {
    expect(mercadoPagoAmountsMatch(100, 50)).toBe(false);
  });
});
