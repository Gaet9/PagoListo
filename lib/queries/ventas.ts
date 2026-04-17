import type { SupabaseClient } from "@supabase/supabase-js";

import type { KeysetCursor } from "@/lib/types/pagination";

const DEFAULT_PAGE_SIZE = 10;

/** Lista completa (p. ej. Cobrar / usos legacy). */
export async function listVentas(client: SupabaseClient, negocioId: string) {
  return client
    .from("ventas")
    .select(
      "id, negocio_id, usuario_id, total, metodo_pago, estado, created_at, venta_items(id, venta_id, producto_id, cantidad, precio_unitario, subtotal, productos(nombre))",
    )
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false });
}

export type ListVentasPageOpts = {
  limit?: number;
  cursor?: KeysetCursor | null;
};

/**
 * Lista paginada (sin ítems): keyset `created_at DESC`, `id DESC`.
 * Pedí `limit + 1` y recortá en el cliente para saber si hay más.
 */
export async function listVentasPage(
  client: SupabaseClient,
  negocioId: string,
  opts: ListVentasPageOpts,
) {
  const limit = opts.limit ?? DEFAULT_PAGE_SIZE;
  const take = limit + 1;

  let q = client
    .from("ventas")
    .select("id, negocio_id, usuario_id, total, metodo_pago, estado, created_at")
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(take);

  if (opts.cursor) {
    const { created_at, id } = opts.cursor;
    q = q.or(
      `created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`,
    );
  }

  return q;
}

export type VentaTotalRow = {
  created_at: string;
  total: string | number | null;
};

/**
 * Solo columnas necesarias para el gráfico (todas las ventas en el rango).
 */
export async function listVentasTotalsForChart(
  client: SupabaseClient,
  negocioId: string,
  opts: { fromIso: string; toIso: string },
) {
  return client
    .from("ventas")
    .select("created_at,total")
    .eq("negocio_id", negocioId)
    .gte("created_at", opts.fromIso)
    .lte("created_at", opts.toIso)
    .order("created_at", { ascending: true })
    .returns<VentaTotalRow[]>();
}

export async function listVentaItemsByVentaId(
  client: SupabaseClient,
  ventaId: string,
) {
  return client
    .from("venta_items")
    .select(
      "id, venta_id, producto_id, cantidad, precio_unitario, subtotal, productos(nombre)",
    )
    .eq("venta_id", ventaId);
}
