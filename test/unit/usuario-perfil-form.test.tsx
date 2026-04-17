import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UsuarioPerfilForm } from "@/components/perfil/usuario-perfil-form";

const updateUsuarioPerfilMock = vi.fn();
vi.mock("@/lib/queries/usuarios", () => ({
  updateUsuarioPerfil: (...args: unknown[]) => updateUsuarioPerfilMock(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

describe("UsuarioPerfilForm", () => {
  beforeEach(() => {
    updateUsuarioPerfilMock.mockReset();
  });

  it("renders initial data and updates nombre/apellido", async () => {
    const user = userEvent.setup();
    updateUsuarioPerfilMock.mockResolvedValue({ data: null, error: null });

    render(
      <UsuarioPerfilForm
        initial={{
          id: "u1",
          email: "test@example.com",
          nombre: "Juan",
          apellido: null,
        }}
      />,
    );

    expect(screen.getByLabelText("Correo")).toHaveValue("test@example.com");
    expect(screen.getByLabelText("Nombre")).toHaveValue("Juan");
    expect(screen.getByLabelText("Apellido")).toHaveValue("");

    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "  Ana  ");
    await user.type(screen.getByLabelText("Apellido"), "  Pérez  ");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(updateUsuarioPerfilMock).toHaveBeenCalledWith({}, {
      id: "u1",
      nombre: "  Ana  ",
      apellido: "  Pérez  ",
    });
  });
});

