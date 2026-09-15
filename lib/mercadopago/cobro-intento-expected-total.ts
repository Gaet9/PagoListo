import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { roundMoneyArs } from "@/lib/mercadopago/cobro-amount";

function storedExpectedTotalArs(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const parsed = parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed : null;
}

export type CobroIntentoItemRow = {
  producto_id?: string;
  qty?: number;
};

function parseIntentoItems(raw: unknown): CobroIntentoItemRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is CobroIntentoItemRow => !!row && typeof row === "object");
}

function parsePrecioVenta(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Recalcula el total desde ítems del intento y precios actuales en BD (filas del mismo negocio). */
export async function computeExpectedTotalArsFromIntentoItems(
  admin: SupabaseClient,
  negocioId: string,
  itemsRaw: unknown,
): Promise<number | null> {
  const items = parseIntentoItems(itemsRaw);
  if (items.length === 0) return null;

  const qtyByProduct = new Map<string, number>();
  for (const row of items) {
    const productoId = typeof row.producto_id === "string" ? row.producto_id.trim() : "";
    const qty = typeof row.qty === "number" && Number.isFinite(row.qty) ? row.qty : null;
    if (!productoId || qty === null || qty <= 0) return null;
    qtyByProduct.set(productoId, (qtyByProduct.get(productoId) ?? 0) + qty);
  }

  const productoIds = [...qtyByProduct.keys()];
  const { data: productos, error } = await admin
    .from("productos")
    .select("id, precio_venta, activo")
    .eq("negocio_id", negocioId)
    .in("id", productoIds);

  if (error || !productos?.length) return null;

  const byId = new Map(productos.map((p) => [p.id as string, p]));
  let total = 0;

  for (const productoId of productoIds) {
    const p = byId.get(productoId);
    if (!p || !p.activo) return null;
    const unitPrice = parsePrecioVenta(p.precio_venta as string | number | null);
    if (unitPrice === null) return null;
    const qty = qtyByProduct.get(productoId)!;
    total = roundMoneyArs(total + unitPrice * qty);
  }

  if (total <= 0) return null;
  return total;
}

/**
 * Total esperado para validar el pago: columna persistida o recálculo para intentos legacy.
 */
export async function resolveCobroIntentoExpectedTotalArs(
  admin: SupabaseClient,
  negocioId: string,
  storedExpectedRaw: number | string | null | undefined,
  itemsRaw: unknown,
): Promise<number | null> {
  const stored = storedExpectedTotalArs(storedExpectedRaw);
  if (stored !== null && stored > 0) return stored;
  return computeExpectedTotalArsFromIntentoItems(admin, negocioId, itemsRaw);
}
