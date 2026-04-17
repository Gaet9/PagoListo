import type { SupabaseClient } from "@supabase/supabase-js";

import type { KeysetCursor } from "@/lib/types/pagination";

/** Fila de `compras` para listados en la tienda. */
export type CompraNegocioRow = {
  id: string;
  created_at: string;
  total: number | string | null;
  notas: string | null;
  proveedor_nombre: string | null;
  proveedor_ref: string | null;
  proveedor_cuit_cuil: string | null;
  comprobante_storage_path: string | null;
};

const DEFAULT_COMPRAS_PAGE_SIZE = 10;

export type ListComprasByNegocioPageOpts = {
  limit?: number;
  cursor?: KeysetCursor | null;
};

/**
 * Lista paginada (keyset): `created_at DESC`, `id DESC`.
 * Pedí `limit + 1` en servidor y recortá en el cliente para `hasMore` (mismo patrón que ventas/movimientos).
 */
export async function listComprasByNegocioPage(
  client: SupabaseClient,
  negocioId: string,
  opts: ListComprasByNegocioPageOpts,
) {
  const limit = opts.limit ?? DEFAULT_COMPRAS_PAGE_SIZE;
  const take = limit + 1;

  let q = client
    .from("compras")
    .select(
      "id, created_at, total, notas, proveedor_nombre, proveedor_ref, proveedor_cuit_cuil, comprobante_storage_path",
    )
    .eq("negocio_id", negocioId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(take);

  if (opts.cursor) {
    const { created_at, id } = opts.cursor;
    q = q.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
  }

  return q;
}

export async function listCompraItemsByCompraId(client: SupabaseClient, compraId: string) {
  return client
    .from("compra_items")
    .select("id, compra_id, producto_id, cantidad, precio_unitario, subtotal, productos(nombre)")
    .eq("compra_id", compraId);
}

export type CompraReposicionLine = {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
};

export type InsertCompraReposicionOpts = {
  usuario_id?: string | null;
  notas?: string | null;
  /** Alta desde pestaña Compras (opcional en BD). */
  proveedor_nombre?: string | null;
  proveedor_ref?: string | null;
  proveedor_cuit_cuil?: string | null;
  /** Ruta del objeto en el bucket `compras-comprobantes` (descarga con URL firmada). */
  comprobante_storage_path?: string | null;
};

/**
 * Inserta una compra (cabecera + líneas). Cada `compra_item` dispara en BD
 * la escritura en `movimientos_stock` (entrada / reposición).
 */
export async function insertCompraReposicion(
  client: SupabaseClient,
  negocioId: string,
  lines: CompraReposicionLine[],
  opts?: InsertCompraReposicionOpts,
) {
  if (lines.length === 0) {
    return { data: null as { compraId: string } | null, error: null };
  }

  for (const l of lines) {
    const q = Math.trunc(Number(l.cantidad));
    if (!Number.isFinite(q) || q <= 0) {
      return {
        data: null,
        error: new Error("Cada línea de compra debe tener cantidad > 0."),
      };
    }
  }

  const total = lines.reduce(
    (acc, l) => acc + Math.trunc(l.cantidad) * l.precio_unitario,
    0,
  );

  const { data: compra, error: cErr } = await client
    .from("compras")
    .insert({
      negocio_id: negocioId,
      usuario_id: opts?.usuario_id ?? null,
      notas: opts?.notas ?? "Reposición de stock",
      total,
      proveedor_nombre: opts?.proveedor_nombre?.trim() || null,
      proveedor_ref: opts?.proveedor_ref?.trim() || null,
      proveedor_cuit_cuil: opts?.proveedor_cuit_cuil?.trim() || null,
      comprobante_storage_path: opts?.comprobante_storage_path?.trim() || null,
    })
    .select("id")
    .single();

  if (cErr || !compra?.id) {
    return { data: null, error: cErr ?? new Error("No se pudo crear la compra.") };
  }

  const compraId = compra.id as string;

  for (const line of lines) {
    const cant = Math.trunc(line.cantidad);
    const sub = cant * line.precio_unitario;
    const { error: iErr } = await client.from("compra_items").insert({
      compra_id: compraId,
      producto_id: line.producto_id,
      cantidad: cant,
      precio_unitario: line.precio_unitario,
      subtotal: sub,
    });
    if (iErr) {
      return { data: null, error: iErr };
    }
  }

  return { data: { compraId }, error: null };
}
