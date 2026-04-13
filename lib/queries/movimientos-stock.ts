import type { SupabaseClient } from "@supabase/supabase-js";
import type { MovimientoStockRow } from "@/lib/types/negocio";

export async function listMovimientosForNegocio(
  client: SupabaseClient,
  negocioId: string,
) {
  const { data: productos, error: e1 } = await client
    .from("productos")
    .select("id")
    .eq("negocio_id", negocioId);

  if (e1) return { data: null, error: e1 };

  const ids = (productos ?? []).map((p) => p.id);
  if (ids.length === 0) {
    return { data: [] as MovimientoStockRow[], error: null };
  }

  return client
    .from("movimientos_stock")
    .select(
      `
      id,
      producto_id,
      tipo,
      cantidad,
      motivo,
      created_at,
      productos ( nombre )
    `,
    )
    .in("producto_id", ids)
    .order("created_at", { ascending: false });
}
