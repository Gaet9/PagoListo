import { describe, expect, it } from "vitest";

import { operacionMovimientoStock } from "@/lib/movimientos-stock-display";

describe("movimientos-stock-display", () => {
  it("operacionMovimientoStock distingue compra, venta y salida manual", () => {
    expect(operacionMovimientoStock({ tipo: "out", venta_id: "v1" })).toBe("Venta");
    expect(operacionMovimientoStock({ tipo: "out", venta_id: null })).toBe("Salida");
    expect(operacionMovimientoStock({ tipo: "in", compra_id: "c1" })).toBe("Compra");
  });
});
