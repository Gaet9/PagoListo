import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  type SaasAbonoAccessContext,
  userCanManageSaasAbonoInContext,
} from "@/lib/auth/saas-abono-access";
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
