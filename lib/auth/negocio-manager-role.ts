import type { SupabaseClient } from "@supabase/supabase-js";

export const NEGOCIO_MANAGER_ROLES = ["owner", "admin"] as const;

/**
 * Manager MVP = owner o admin en `negocio_usuarios` (vía RPC RLS-safe).
 */
export async function userHasNegocioManagerRole(
  supabase: SupabaseClient,
  negocioId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_negocio_role", {
    p_negocio_id: negocioId,
    p_roles: [...NEGOCIO_MANAGER_ROLES],
  });
  if (error) {
    return false;
  }
  return data === true;
}

