import { describe, expect, it, vi } from "vitest";

import { enrichNegocioMiembrosWithUsuarios } from "@/lib/negocio/enrich-negocio-miembros";

describe("enrichNegocioMiembrosWithUsuarios", () => {
  it("adjunta perfiles para cada fila de membresía", async () => {
    const admin = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        returns: vi.fn().mockResolvedValue({
          data: [
            {
              id: "u-owner",
              email: "owner@example.com",
              nombre: "Ana",
              apellido: "López",
            },
            {
              id: "u-emp",
              email: "empleado@example.com",
              nombre: "Rod",
              apellido: null,
            },
          ],
          error: null,
        }),
      })),
    };

    const { miembros, error } = await enrichNegocioMiembrosWithUsuarios(admin as never, [
      { usuario_id: "u-owner", role: "owner" },
      { usuario_id: "u-emp", role: "employee" },
    ]);

    expect(error).toBeNull();
    expect(miembros).toHaveLength(2);
    expect(miembros[1]?.usuarios?.email).toBe("empleado@example.com");
  });
});
