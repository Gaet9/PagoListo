import type { ProductosTotals } from "@/lib/queries/productos";
import type { ProductoRow } from "@/lib/types/negocio";

/** Valores normalizados del formulario al confirmar Listo (no confundir con `ProductoRow` en DB). */
export type ProductoEditablePatch = {
  nombre: string;
  barcode: string | null;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  activo: boolean;
};

function parseMoneyField(v: string | number | null | undefined): number {
  const n =
    typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function cloneProductosTotals(t: ProductosTotals): ProductosTotals {
  return {
    lineCount: t.lineCount,
    stockTotal: t.stockTotal,
    sumPrecioCompra: t.sumPrecioCompra,
    sumPrecioVenta: t.sumPrecioVenta,
  };
}

/** Ajusta totales del pie tras aplicar un patch a una fila ya contada en `totals`. */
export function applyProductoPatchDeltaToTotals(
  totals: ProductosTotals,
  prevRow: Pick<ProductoRow, "precio_compra" | "precio_venta" | "stock_actual">,
  patch: Pick<ProductoEditablePatch, "precio_compra" | "precio_venta" | "stock_actual">,
): ProductosTotals {
  const prevCompra = parseMoneyField(prevRow.precio_compra);
  const prevVenta = parseMoneyField(prevRow.precio_venta);
  const stockDelta = patch.stock_actual - (Number(prevRow.stock_actual) || 0);

  return {
    lineCount: totals.lineCount,
    stockTotal: totals.stockTotal + stockDelta,
    sumPrecioCompra: totals.sumPrecioCompra + (patch.precio_compra - prevCompra),
    sumPrecioVenta: totals.sumPrecioVenta + (patch.precio_venta - prevVenta),
  };
}
