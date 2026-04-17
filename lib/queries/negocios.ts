import type { SupabaseClient } from "@supabase/supabase-js";
import type { NegocioListItem } from "@/lib/types/negocio";

export async function listNegocios(client: SupabaseClient) {
  return client
    .from("negocios")
    .select("id, nombre, localizacion")
    .order("nombre");
}

export type InsertNegocioInput = {
  nombre: string;
  localizacion?: string | null;
  propietario_id: string;
};

export async function insertNegocio(
  client: SupabaseClient,
  input: InsertNegocioInput,
) {
  return client
    .from("negocios")
    .insert({
      nombre: input.nombre.trim(),
      localizacion: input.localizacion?.trim() || null,
      propietario_id: input.propietario_id,
    })
    .select("id, nombre, localizacion")
    .single();
}

/** Elimina el negocio si RLS lo permite (dueño / políticas en Supabase). */
export async function deleteNegocioById(client: SupabaseClient, negocioId: string) {
  return client.from("negocios").delete().eq("id", negocioId);
}
