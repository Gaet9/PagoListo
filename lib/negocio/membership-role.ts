import type { NegocioMembershipRole } from "@/lib/types/negocio-membership";

const MANAGER_ROLES: ReadonlySet<NegocioMembershipRole> = new Set(["owner", "admin"]);

export function parseNegocioMembershipRole(raw: unknown): NegocioMembershipRole | null {
  if (raw === "owner" || raw === "admin" || raw === "employee") {
    return raw;
  }
  return null;
}

export function isNegocioManagerRole(role: NegocioMembershipRole | null | undefined): boolean {
  return role != null && MANAGER_ROLES.has(role);
}

export function isNegocioEmployeeRole(role: NegocioMembershipRole | null | undefined): boolean {
  return role === "employee";
}

export function negocioMembershipRoleLabel(role: NegocioMembershipRole): string {
  switch (role) {
    case "owner":
      return "Dueño";
    case "admin":
      return "Administrador";
    case "employee":
      return "Empleado";
  }
}

/** Tabs visibles solo para owner/admin del negocio activo. */
export const MANAGER_ONLY_TIENDA_TABS = ["movimientos", "configuracion"] as const;

export type TiendaTabId = "cobrar" | "compras" | "productos" | "ventas" | "movimientos" | "configuracion";

export function isManagerOnlyTiendaTab(tab: string): tab is (typeof MANAGER_ONLY_TIENDA_TABS)[number] {
  return (MANAGER_ONLY_TIENDA_TABS as readonly string[]).includes(tab);
}

export function canAccessTiendaTab(tab: TiendaTabId, isManager: boolean): boolean {
  if (!isManager && isManagerOnlyTiendaTab(tab)) {
    return false;
  }
  return true;
}

export function userHasAnyManagerMembership(
  memberships: ReadonlyArray<{ role: NegocioMembershipRole | string }>,
): boolean {
  return memberships.some((m) => isNegocioManagerRole(parseNegocioMembershipRole(m.role)));
}
