/** Rol de membresía en `negocio_usuarios` (fuente de verdad para AuthZ por negocio). */
export type NegocioMembershipRole = "owner" | "admin" | "employee";

export type NegocioUsuarioRow = {
  negocio_id: string;
  usuario_id: string;
  role: NegocioMembershipRole;
};

/** Fila de `negocio_usuarios` sin join (seguro bajo RLS del caller). */
export type NegocioMiembroMembershipRow = {
  usuario_id: string;
  role: NegocioMembershipRole;
};

export type NegocioMiembroUsuarioPerfil = {
  email: string;
  nombre: string;
  apellido: string | null;
};

export type NegocioMiembroListItem = NegocioMiembroMembershipRow & {
  usuarios: NegocioMiembroUsuarioPerfil | null;
};
