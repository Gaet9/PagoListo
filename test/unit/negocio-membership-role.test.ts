import { describe, expect, it } from "vitest";

import {
  canAccessTiendaTab,
  isNegocioManagerRole,
  parseNegocioMembershipRole,
  userHasAnyManagerMembership,
} from "@/lib/negocio/membership-role";

describe("negocio membership role helpers", () => {
  it("parsea roles válidos y rechaza desconocidos", () => {
    expect(parseNegocioMembershipRole("owner")).toBe("owner");
    expect(parseNegocioMembershipRole("admin")).toBe("admin");
    expect(parseNegocioMembershipRole("employee")).toBe("employee");
    expect(parseNegocioMembershipRole("superuser")).toBeNull();
  });

  it("manager = owner o admin", () => {
    expect(isNegocioManagerRole("owner")).toBe(true);
    expect(isNegocioManagerRole("admin")).toBe(true);
    expect(isNegocioManagerRole("employee")).toBe(false);
    expect(isNegocioManagerRole(null)).toBe(false);
  });

  it("empleado no accede a tabs de manager", () => {
    expect(canAccessTiendaTab("cobrar", false)).toBe(true);
    expect(canAccessTiendaTab("configuracion", false)).toBe(false);
    expect(canAccessTiendaTab("movimientos", false)).toBe(false);
    expect(canAccessTiendaTab("configuracion", true)).toBe(true);
  });

  it("detecta si el usuario tiene algún rol de manager", () => {
    expect(userHasAnyManagerMembership([{ role: "employee" }])).toBe(false);
    expect(userHasAnyManagerMembership([{ role: "employee" }, { role: "admin" }])).toBe(true);
  });
});
