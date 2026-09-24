import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSaasAbonoAccessForUser } from "@/lib/auth/saas-abono-access.server";
import { userHasNegocioManagerRole } from "@/lib/auth/negocio-manager-role";

const FORBIDDEN_NEGOCIO_MANAGER =
  "No tenés permisos para esta acción. Solo el dueño o un administrador del negocio puede hacerlo.";
const FORBIDDEN_SAAS =
  "No tenés permisos para gestionar el abono. Solo el dueño o un administrador puede contratar o cancelar.";

export async function denyUnlessNegocioManager(
  supabase: SupabaseClient,
  negocioId: string,
): Promise<NextResponse | null> {
  const isManager = await userHasNegocioManagerRole(supabase, negocioId);
  if (!isManager) {
    return NextResponse.json({ error: FORBIDDEN_NEGOCIO_MANAGER }, { status: 403 });
  }
  return null;
}

export async function denyUnlessSaasManager(
  supabase: SupabaseClient,
  userId: string,
): Promise<NextResponse | null> {
  const { canManage } = await getSaasAbonoAccessForUser(supabase, userId);
  if (!canManage) {
    return NextResponse.json({ error: FORBIDDEN_SAAS }, { status: 403 });
  }
  return null;
}
