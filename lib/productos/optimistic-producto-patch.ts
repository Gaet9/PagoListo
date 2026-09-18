import type { ProductosTotals } from "@/lib/queries/productos";
import type { ProductoRow } from "@/lib/types/negocio";

export type ProductoEditablePatch = Pick<
  ProductoRow,
  "nombre" | "barcode" | "precio_compra" | "precio_venta" | "stock_actual" | "activo"
>;

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
  const stockDelta = patch.stock_actual - prevRow.stock_actual;
  const compraDelta = patch.precio_compra - prevRow.precio_compra;
  const ventaDelta = patch.precio_venta - prevRow.precio_venta;

  return {
    lineCount: totals.lineCount,
    stockTotal: totals.stockTotal + stockDelta,
    sumPrecioCompra: totals.sumPrecioCompra + compraDelta,
    sumPrecioVenta: totals.sumPrecioVenta + ventaDelta,
  };
}
