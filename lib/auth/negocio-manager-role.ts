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

export async function userIsPropietarioOfNegocio(
  supabase: SupabaseClient,
  negocioId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("negocios")
    .select("id")
    .eq("id", negocioId)
    .eq("propietario_id", userId)
    .maybeSingle();

  if (error) {
    return false;
  }
  return data != null;
}

/**
 * GAE-17: gestionar abono SaaS exige owner|admin en el negocio indicado (no «cualquier» manager).
 */
export async function userCanManageSaasForScopedNegocio(
  supabase: SupabaseClient,
  negocioId: string,
  userId: string,
): Promise<boolean> {
  if (await userHasNegocioManagerRole(supabase, negocioId)) {
    return true;
  }
  return userIsPropietarioOfNegocio(supabase, negocioId, userId);
}
