import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  NegocioMiembroListItem,
  NegocioMiembroMembershipRow,
  NegocioMiembroUsuarioPerfil,
} from "@/lib/types/negocio-membership";

type UsuarioPerfilRow = {
  id: string;
  email: string;
  nombre: string;
  apellido: string | null;
};

export async function enrichNegocioMiembrosWithUsuarios(
  admin: SupabaseClient,
  rows: NegocioMiembroMembershipRow[],
): Promise<{ miembros: NegocioMiembroListItem[]; error: string | null }> {
  if (rows.length === 0) {
    return { miembros: [], error: null };
  }

  const usuarioIds = rows.map((row) => row.usuario_id);
  const { data: perfiles, error } = await admin
    .from("usuarios")
    .select("id, email, nombre, apellido")
    .in("id", usuarioIds)
    .returns<UsuarioPerfilRow[]>();

  if (error) {
    return { miembros: [], error: error.message };
  }

  const byId = new Map<string, NegocioMiembroUsuarioPerfil>();
  for (const perfil of perfiles ?? []) {
    byId.set(perfil.id, {
      email: perfil.email,
      nombre: perfil.nombre,
      apellido: perfil.apellido,
    });
  }

  const miembros: NegocioMiembroListItem[] = rows.map((row) => ({
    usuario_id: row.usuario_id,
    role: row.role,
    usuarios: byId.get(row.usuario_id) ?? null,
  }));

  return { miembros, error: null };
}
