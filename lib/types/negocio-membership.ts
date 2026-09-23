/** Rol de membresía en `negocio_usuarios` (fuente de verdad para AuthZ por negocio). */
export type NegocioMembershipRole = "owner" | "admin" | "employee";

export type NegocioUsuarioRow = {
  negocio_id: string;
  usuario_id: string;
  role: NegocioMembershipRole;
};

export type NegocioMiembroListItem = {
  usuario_id: string;
  role: NegocioMembershipRole;
  usuarios: {
    email: string;
    nombre: string;
    apellido: string | null;
  } | null;
};
