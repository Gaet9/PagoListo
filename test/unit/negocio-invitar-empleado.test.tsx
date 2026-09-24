import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NegocioInvitarEmpleado } from "@/components/tienda/negocio-invitar-empleado";

const listNegocioMiembrosMock = vi.fn();

vi.mock("@/lib/queries/negocio-usuarios", () => ({
  listNegocioMiembros: (...args: unknown[]) => listNegocioMiembrosMock(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

describe("NegocioInvitarEmpleado", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    listNegocioMiembrosMock.mockReset();
    listNegocioMiembrosMock.mockResolvedValue({
      data: [
        {
          usuario_id: "u-owner",
          role: "owner",
          usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
        },
      ],
      error: null,
    });

    globalThis.fetch = vi.fn(async (): Promise<Response> => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("lista miembros con listNegocioMiembros (RLS) al montar", async () => {
    render(<NegocioInvitarEmpleado negocioId="n1" />);

    await waitFor(() => {
      expect(listNegocioMiembrosMock).toHaveBeenCalledWith({}, "n1");
    });
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("Dueño")).toBeInTheDocument();
  });

  it("muestra filas sin join de usuarios y refetch tras invitar", async () => {
    listNegocioMiembrosMock
      .mockResolvedValueOnce({
        data: [
          {
            usuario_id: "u-owner",
            role: "owner",
            usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            usuario_id: "u-owner",
            role: "owner",
            usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
          },
          { usuario_id: "u-emp", role: "employee", usuarios: null },
        ],
        error: null,
      });

    const user = userEvent.setup();
    render(<NegocioInvitarEmpleado negocioId="n1" />);

    await waitFor(() => {
      expect(screen.getByText("Ana López")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Correo/i), "empleado@ejemplo.com");
    await user.click(screen.getByRole("button", { name: /Agregar empleado/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Empleado").length).toBeGreaterThanOrEqual(1);
    });
    expect(listNegocioMiembrosMock).toHaveBeenCalledTimes(2);
  });
});
