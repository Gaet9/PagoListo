import type { SupabaseClient } from "@supabase/supabase-js";
import type { MercadoPagoConexion } from "@/lib/types/mercadopago";

export async function listMercadoPagoConexiones(
  client: SupabaseClient,
  negocioIds: string[],
) {
  if (negocioIds.length === 0) {
    return { data: [] as MercadoPagoConexion[], error: null as null };
  }

  return client
    .from("mercadopago_conexiones")
    .select("negocio_id, mp_user_id, created_at, updated_at")
    .in("negocio_id", negocioIds)
    .returns<MercadoPagoConexion[]>();
}

