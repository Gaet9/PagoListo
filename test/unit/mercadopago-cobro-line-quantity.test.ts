import { describe, expect, it } from "vitest";

import {
  MAX_COBRO_LINE_QUANTITY,
  buildCobroQuantityByProduct,
  parsePositiveIntQuantity,
} from "@/lib/mercadopago/cobro-line-quantity";

describe("parsePositiveIntQuantity", () => {
  it("accepts positive integers", () => {
    expect(parsePositiveIntQuantity(3, "qty")).toEqual({ ok: true, qty: 3 });
    expect(parsePositiveIntQuantity(1, "qty")).toEqual({ ok: true, qty: 1 });
  });

  it("rejects decimals (RPC truncates qty to int)", () => {
    const r = parsePositiveIntQuantity(2.7, "items[0].quantity");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/entero positivo/i);
  });

  it("rejects zero and negatives", () => {
    expect(parsePositiveIntQuantity(0, "qty").ok).toBe(false);
    expect(parsePositiveIntQuantity(-1, "qty").ok).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(parsePositiveIntQuantity(Number.NaN, "qty").ok).toBe(false);
    expect(parsePositiveIntQuantity(Number.POSITIVE_INFINITY, "qty").ok).toBe(false);
    expect(parsePositiveIntQuantity("2" as unknown as number, "qty").ok).toBe(false);
  });

  it("rejects above max", () => {
    expect(parsePositiveIntQuantity(MAX_COBRO_LINE_QUANTITY + 1, "qty").ok).toBe(false);
  });
});

describe("buildCobroQuantityByProduct", () => {
  const productId = "11111111-1111-4111-8111-111111111111";

  it("aggregates duplicate product ids", () => {
    const r = buildCobroQuantityByProduct([
      { id: productId, quantity: 2 },
      { id: productId, quantity: 3 },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.qtyByProduct.get(productId)).toBe(5);
  });

  it("rejects decimal quantity in a line", () => {
    const r = buildCobroQuantityByProduct([{ id: productId, quantity: 1.5 }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects when merged quantity exceeds max", () => {
    const r = buildCobroQuantityByProduct([
      { id: productId, quantity: MAX_COBRO_LINE_QUANTITY },
      { id: productId, quantity: 1 },
    ]);
    expect(r.ok).toBe(false);
  });

  it("requires product id", () => {
    const r = buildCobroQuantityByProduct([{ quantity: 1 }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/línea 1/i);
  });
});
