import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CambiarContrasenaPerfilCard } from "@/components/perfil/cambiar-contrasena-perfil-card";

const { verifyMock, updateMock } = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/auth/change-password", () => ({
  verifyCurrentPassword: (...args: unknown[]) => verifyMock(...args),
  updateSessionPassword: (...args: unknown[]) => updateMock(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const toastSuccess = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));

describe("CambiarContrasenaPerfilCard", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    updateMock.mockReset();
    toastSuccess.mockReset();
  });

  it("no renderiza nada si el email está vacío", () => {
    const { container } = render(<CambiarContrasenaPerfilCard email="   " />);
    expect(container.firstChild).toBeNull();
  });

  it("pasa de verificación a nueva contraseña y guarda con éxito", async () => {
    verifyMock.mockResolvedValue({ ok: true });
    updateMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    render(<CambiarContrasenaPerfilCard email="user@test.com" />);

    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await user.type(screen.getByLabelText(/contraseña actual/i), "old-pass-ok");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(verifyMock).toHaveBeenCalled();
    expect(screen.getByText(/Elegí una contraseña de al menos/)).toBeInTheDocument();

    const nueva = "nueva1234";
    await user.type(screen.getByLabelText(/^nueva contraseña$/i), nueva);
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), nueva);
    await user.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));

    expect(updateMock).toHaveBeenCalledWith(expect.anything(), nueva);
    expect(toastSuccess).toHaveBeenCalledWith("Contraseña actualizada");
    expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeInTheDocument();
  });

  it("muestra error si la verificación de la contraseña actual falla", async () => {
    verifyMock.mockResolvedValue({ ok: false, message: "La contraseña actual no es correcta." });
    const user = userEvent.setup();

    render(<CambiarContrasenaPerfilCard email="user@test.com" />);
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await user.type(screen.getByLabelText(/contraseña actual/i), "wrong");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen.getByText("La contraseña actual no es correcta."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Elegí una contraseña de al menos/)).not.toBeInTheDocument();
  });

  it("muestra error si la nueva contraseña y la confirmación no coinciden", async () => {
    verifyMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<CambiarContrasenaPerfilCard email="user@test.com" />);
    await user.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    await user.type(screen.getByLabelText(/contraseña actual/i), "old");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await user.type(screen.getByLabelText(/^nueva contraseña$/i), "aaaaaaaa");
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), "bbbbbbbb");
    await user.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));

    expect(
      screen.getByText("La nueva contraseña y la confirmación no coinciden."),
    ).toBeInTheDocument();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
