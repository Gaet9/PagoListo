import { describe, it, expect } from "vitest";

import {
  applyProductoPatchDeltaToTotals,
  cloneProductosTotals,
} from "@/lib/productos/optimistic-producto-patch";

describe("applyProductoPatchDeltaToTotals", () => {
  const totals = {
    lineCount: 2,
    stockTotal: 10,
    sumPrecioCompra: 30,
    sumPrecioVenta: 50,
  };

  it("updates sums and stock for one product patch", () => {
    const prevRow = {
      precio_compra: 10,
      precio_venta: 20,
      stock_actual: 3,
    };
    const patch = {
      precio_compra: 12,
      precio_venta: 25,
      stock_actual: 5,
    };

    expect(applyProductoPatchDeltaToTotals(totals, prevRow, patch)).toEqual({
      lineCount: 2,
      stockTotal: 12,
      sumPrecioCompra: 32,
      sumPrecioVenta: 55,
    });
  });

  it("cloneProductosTotals copies values", () => {
    const copy = cloneProductosTotals(totals);
    expect(copy).toEqual(totals);
    expect(copy).not.toBe(totals);
  });
});
