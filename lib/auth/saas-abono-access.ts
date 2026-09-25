import type { SupabaseClient } from "@supabase/supabase-js";

import { userHasNegocioManagerRole } from "@/lib/auth/negocio-manager-role";
import { resolveActiveNegocioId } from "@/lib/negocio/active-negocio-context";
import {
  isNegocioEmployeeRole,
  isNegocioManagerRole,
} from "@/lib/negocio/membership-role";
import {
  getNegocioMembershipRoleForUser,
  resolveMembershipRoleFromQuery,
} from "@/lib/queries/negocio-usuarios";

export type SaasAbonoAccessContext = {
  canManage: boolean;
  activeNegocioId: string | null;
};

/**
 * Abono SaaS: solo owner/admin del negocio **activo** (context-hide GAE-17).
 * Sin negocios → puede contratar abono propio (cuenta nueva).
 */
export async function userCanManageSaasAbonoInContext(
  supabase: SupabaseClient,
  userId: string,
  options: {
    negocioIds: readonly string[];
    activeNegocioId: string | null;
  },
): Promise<boolean> {
  if (options.negocioIds.length === 0) {
    return true;
  }

  const negocioId = resolveActiveNegocioId(options.activeNegocioId, options.negocioIds);
  if (!negocioId) {
    return false;
  }

  const { data, error } = await getNegocioMembershipRoleForUser(supabase, negocioId, userId);
  const role = resolveMembershipRoleFromQuery(data, error);

  if (isNegocioEmployeeRole(role)) {
    return false;
  }
  if (isNegocioManagerRole(role)) {
    return true;
  }

  return userHasNegocioManagerRole(supabase, negocioId);
}
