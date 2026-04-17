/**
 * Textos de UI para filas de `movimientos_stock` (sin columna `motivo` en BD).
 */
export function operacionMovimientoStock(m: {
  tipo: string;
  venta_id?: string | null;
  compra_id?: string | null;
}): string {
  if (m.tipo === "in") return "Compra";
  if (m.tipo === "out") return m.venta_id ? "Venta" : "Salida";
  if (m.tipo === "ajuste") return "Ajuste";
  return m.tipo;
}
