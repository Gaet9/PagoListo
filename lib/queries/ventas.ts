import type { SupabaseClient } from "@supabase/supabase-js";

export async function listVentas(client: SupabaseClient, negocioId: string) {
    return client
        .from("ventas")
        .select("id, negocio_id, usuario_id, total, metodo_pago, estado, created_at")
        .eq("negocio_id", negocioId)
        .order("created_at", { ascending: false });
}
