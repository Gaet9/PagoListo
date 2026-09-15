import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Items } from "mercadopago/dist/clients/commonTypes";

import { roundMoneyArs } from "@/lib/mercadopago/cobro-amount";
import { buildCobroQuantityByProduct, type CobroLineQuantityInput } from "@/lib/mercadopago/cobro-line-quantity";

export type CobroLineRequest = CobroLineQuantityInput;

export type ResolvedCobroLine = {
  producto_id: string;
  qty: number;
  title: string;
  unit_price: number;
};

export type ResolveCobroLinesResult =
  | { ok: true; lines: ResolvedCobroLine[]; mpItems: Items[]; expectedTotalArs: number; intentoItems: Array<{ producto_id: string; qty: number }> }
  | { ok: false; error: string; status: number };

function parsePrecioVenta(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Resuelve líneas de cobro desde la BD (precios y nombres del servidor).
 * El cliente solo puede elegir producto_id y cantidad.
 */
export async function resolveCobroPreferenceLines(
  admin: SupabaseClient,
  negocioId: string,
  rawItems: CobroLineRequest[],
): Promise<ResolveCobroLinesResult> {
  const qtyMap = buildCobroQuantityByProduct(rawItems);
  if (!qtyMap.ok) {
    return { ok: false, error: qtyMap.error, status: qtyMap.status };
  }
  const qtyByProduct = qtyMap.qtyByProduct;

  const productoIds = [...qtyByProduct.keys()];
  const { data: productos, error } = await admin
    .from("productos")
    .select("id, nombre, precio_venta, activo")
    .eq("negocio_id", negocioId)
    .in("id", productoIds);

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  const byId = new Map((productos ?? []).map((p) => [p.id as string, p]));
  const lines: ResolvedCobroLine[] = [];
  let expectedTotalArs = 0;

  for (const productoId of productoIds) {
    const p = byId.get(productoId);
    if (!p) {
      return { ok: false, error: "Producto no encontrado en este negocio", status: 400 };
    }
    if (!p.activo) {
      return { ok: false, error: `El producto "${p.nombre}" no está activo`, status: 400 };
    }
    const unitPrice = parsePrecioVenta(p.precio_venta as string | number | null);
    if (unitPrice === null) {
      return { ok: false, error: `Precio de venta inválido para "${p.nombre}"`, status: 400 };
    }
    const qty = qtyByProduct.get(productoId)!;
    const lineTotal = roundMoneyArs(unitPrice * qty);
    expectedTotalArs = roundMoneyArs(expectedTotalArs + lineTotal);
    lines.push({
      producto_id: productoId,
      qty,
      title: String(p.nombre).trim(),
      unit_price: unitPrice,
    });
  }

  if (expectedTotalArs <= 0) {
    return { ok: false, error: "El total del cobro debe ser mayor a cero", status: 400 };
  }

  const mpItems: Items[] = lines.map((line) => ({
    id: line.producto_id,
    title: line.title,
    quantity: line.qty,
    unit_price: line.unit_price,
    currency_id: "ARS",
  }));

  const intentoItems = lines.map((line) => ({ producto_id: line.producto_id, qty: line.qty }));

  return { ok: true, lines, mpItems, expectedTotalArs, intentoItems };
}
