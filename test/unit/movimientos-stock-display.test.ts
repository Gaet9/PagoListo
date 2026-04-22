import { describe, expect, it } from "vitest";

import { labelOperacionDesdeMotivo, operacionMovimientoStock } from "@/lib/movimientos-stock-display";

describe("movimientos-stock-display", () => {
  it("operacionMovimientoStock distingue compra, venta y ajuste manual", () => {
    expect(operacionMovimientoStock({ tipo: "out", venta_id: "v1" })).toBe("Venta");
    expect(operacionMovimientoStock({ tipo: "out", venta_id: null })).toBe("Ajuste");
    expect(operacionMovimientoStock({ tipo: "in", compra_id: "c1" })).toBe("Compra");
  });

  it("prioriza motivo de BD cuando viene informado", () => {
    expect(operacionMovimientoStock({ tipo: "out", venta_id: "v1", motivo: "Devolución" })).toBe("Devolución");
  });

  it("trata reposición histórica como Compra en pantalla", () => {
    expect(labelOperacionDesdeMotivo("reposicion")).toBe("Compra");
    expect(labelOperacionDesdeMotivo("Reposición")).toBe("Compra");
    expect(operacionMovimientoStock({ tipo: "in", motivo: "reposicion" })).toBe("Compra");
  });
});
