import type { SupabaseClient } from "@supabase/supabase-js";

import { parseNegocioMembershipRole } from "@/lib/negocio/membership-role";
import type {
  NegocioMembershipRole,
  NegocioMiembroListItem,
  NegocioUsuarioRow,
} from "@/lib/types/negocio-membership";

export async function getNegocioMembershipRoleForUser(
  client: SupabaseClient,
  negocioId: string,
  userId: string,
) {
  return client
    .from("negocio_usuarios")
    .select("role")
    .eq("negocio_id", negocioId)
    .eq("usuario_id", userId)
    .maybeSingle<{ role: NegocioMembershipRole }>();
}

export function resolveMembershipRoleFromQuery(
  data: { role: NegocioMembershipRole } | null,
  error: { message: string } | null,
): NegocioMembershipRole | null {
  if (error || !data) return null;
  return parseNegocioMembershipRole(data.role);
}

export async function listNegocioMembershipsForUser(client: SupabaseClient, userId: string) {
  return client
    .from("negocio_usuarios")
    .select("negocio_id, role")
    .eq("usuario_id", userId);
}

export async function listNegocioMiembros(client: SupabaseClient, negocioId: string) {
  return client
    .from("negocio_usuarios")
    .select("usuario_id, role, usuarios ( email, nombre, apellido )")
    .eq("negocio_id", negocioId)
    .order("role")
    .returns<NegocioMiembroListItem[]>();
}

export type InsertNegocioMiembroInput = {
  negocio_id: string;
  usuario_id: string;
  role: NegocioMembershipRole;
};

export async function insertNegocioMiembro(client: SupabaseClient, input: InsertNegocioMiembroInput) {
  return client
    .from("negocio_usuarios")
    .insert({
      negocio_id: input.negocio_id,
      usuario_id: input.usuario_id,
      role: input.role,
    })
    .select("negocio_id, usuario_id, role")
    .single<NegocioUsuarioRow>();
}
