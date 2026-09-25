import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type SaasAbonoAccessContext,
  userCanManageSaasAbonoInContext,
} from "@/lib/auth/saas-abono-access";
import { userCanManageSaasForScopedNegocio } from "@/lib/auth/negocio-manager-role";
import { resolveActiveNegocioId } from "@/lib/negocio/active-negocio-context";
import { readActiveNegocioIdFromRequestCookies } from "@/lib/negocio/active-negocio-context.server";
import { listNegocios } from "@/lib/queries/negocios";

export type { SaasAbonoAccessContext };

export async function getSaasAbonoAccessForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SaasAbonoAccessContext> {
  const cookieNegocioId = await readActiveNegocioIdFromRequestCookies();
  const { data: negocios } = await listNegocios(supabase);
  const negocioIds = (negocios ?? []).map((n) => n.id);
  const activeNegocioId = resolveActiveNegocioId(cookieNegocioId, negocioIds);
  const canManage = await userCanManageSaasAbonoInContext(supabase, userId, {
    negocioIds,
    activeNegocioId,
  });
  return { canManage, activeNegocioId };
}

/**
 * API preference/cancel: cookie `pagolisto_active_negocio_id` + body `negocioId` opcional.
 * Siempre owner|admin en el negocio en scope (nunca «manager en cualquier tienda»).
 */
export async function isSaasAbonoManageAllowedForApi(
  supabase: SupabaseClient,
  userId: string,
  negocioIdFromBody?: string | null,
): Promise<boolean> {
  const bodyScope = negocioIdFromBody?.trim() ?? "";
  const { canManage, activeNegocioId } = await getSaasAbonoAccessForUser(supabase, userId);
  const { data: negocios } = await listNegocios(supabase);
  const negocioIds = (negocios ?? []).map((n) => n.id);

  if (negocioIds.length === 0) {
    return canManage;
  }

  if (bodyScope) {
    if (!negocioIds.includes(bodyScope)) {
      return false;
    }
    return userCanManageSaasForScopedNegocio(supabase, bodyScope, userId);
  }

  if (!activeNegocioId) {
    return false;
  }

  return canManage;
}
