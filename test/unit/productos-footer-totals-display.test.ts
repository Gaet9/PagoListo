import { describe, it, expect } from "vitest";

import {
  cloneProductosTotals,
  resolveFooterTotalsFrozen,
  resolveFooterTotalsLegacy17ee6a4,
} from "@/lib/productos/footer-totals-display";

const base = {
  lineCount: 1,
  stockTotal: 3,
  sumPrecioCompra: 10,
  sumPrecioVenta: 200,
};

describe("resolveFooterTotalsLegacy17ee6a4 (shipped #43 / 17ee6a4)", () => {
  it("lets the footer follow live totals mid-edit when snapshot was null (Charlie 200→201 leak)", () => {
    const liveAfterFetch = { ...base, sumPrecioVenta: 201 };

    expect(
      resolveFooterTotalsLegacy17ee6a4("p1", null, liveAfterFetch),
    ).toEqual(liveAfterFetch);
  });
});

describe("resolveFooterTotalsFrozen", () => {
  it("keeps footer on snapshot while editing even if live totals change", () => {
    const frozen = cloneProductosTotals(base);
    const liveAfterFetch = { ...base, sumPrecioVenta: 201 };

    expect(resolveFooterTotalsFrozen("p1", frozen, liveAfterFetch)).toEqual(
      base,
    );
  });

  it("uses live totals when not editing", () => {
    const live = { ...base, sumPrecioVenta: 201 };
    expect(resolveFooterTotalsFrozen(null, null, live)).toEqual(live);
  });
});
