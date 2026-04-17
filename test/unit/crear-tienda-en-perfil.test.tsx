import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CrearTiendaEnPerfil } from "@/components/perfil/crear-tienda-en-perfil";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
    },
  }),
}));

const insertNegocioMock = vi.fn();

vi.mock("@/lib/queries/negocios", () => ({
  insertNegocio: (...args: unknown[]) => insertNegocioMock(...args),
}));

describe("CrearTiendaEnPerfil", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    insertNegocioMock.mockReset();
  });

  it("abre el formulario al pulsar Crear nueva tienda y lo cierra con Cancelar", async () => {
    const user = userEvent.setup();
    render(<CrearTiendaEnPerfil />);

    await user.click(screen.getByRole("button", { name: "Crear nueva tienda" }));
    expect(screen.getByText("Nueva tienda")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText("Nueva tienda")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear nueva tienda" })).toBeInTheDocument();
  });

  it("tras crear tienda refresca la vista", async () => {
    insertNegocioMock.mockResolvedValue({
      data: { id: "n1", nombre: "Kiosco", localizacion: null },
      error: null,
    });

    const user = userEvent.setup();
    render(<CrearTiendaEnPerfil />);

    await user.click(screen.getByRole("button", { name: "Crear nueva tienda" }));
    await user.type(screen.getByLabelText(/Nombre del negocio/i), "Kiosco");
    await user.click(screen.getByRole("button", { name: "Crear tienda" }));

    expect(insertNegocioMock).toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Crear nueva tienda" })).toBeInTheDocument();
  });
});
