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

/**
 * Usuarios que solo son empleados en todos sus negocios no pueden comprar/cancelar abono SaaS.
 * Propietarios sin fila en negocio_usuarios (legacy) siguen pudiendo gestionar abono.
 */
export async function userCanManageSaasSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: managerMembership, error: managerErr } = await supabase
    .from("negocio_usuarios")
    .select("negocio_id")
    .eq("usuario_id", userId)
    .in("role", [...NEGOCIO_MANAGER_ROLES])
    .limit(1);

  if (managerErr) {
    return false;
  }
  if (managerMembership && managerMembership.length > 0) {
    return true;
  }

  const { data: ownedNegocios, error: ownedErr } = await supabase
    .from("negocios")
    .select("id")
    .eq("propietario_id", userId)
    .limit(1);

  if (ownedErr) {
    return false;
  }
  if (ownedNegocios && ownedNegocios.length > 0) {
    return true;
  }

  const { data: anyMembership, error: anyErr } = await supabase
    .from("negocio_usuarios")
    .select("negocio_id")
    .eq("usuario_id", userId)
    .limit(1);

  if (anyErr) {
    return false;
  }

  // Solo empleado en al menos un negocio → no SaaS.
  if (anyMembership && anyMembership.length > 0) {
    return false;
  }

  // Sin vínculo a negocio (alta nueva): puede contratar abono propio.
  return true;
}
