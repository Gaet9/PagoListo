import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NegocioInvitarEmpleado } from "@/components/tienda/negocio-invitar-empleado";

describe("NegocioInvitarEmpleado", () => {
  const originalFetch = globalThis.fetch;

  let miembrosPayload: { miembros: unknown[] };

  beforeEach(() => {
    miembrosPayload = {
      miembros: [
        {
          usuario_id: "u-owner",
          role: "owner",
          usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
        },
      ],
    };

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string" ? input
        : input instanceof URL ? input.toString()
        : input.url;
      const method = init?.method?.toUpperCase() ?? "GET";

      if (url.includes("/api/negocios/miembros") && method === "GET") {
        return new Response(JSON.stringify(miembrosPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/negocios/miembros") && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("lista miembros vía GET /api/negocios/miembros al montar", async () => {
    render(<NegocioInvitarEmpleado negocioId="n1" />);

    await waitFor(() => {
      expect(screen.getByText("Ana López")).toBeInTheDocument();
    });
    expect(String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toBe(
      "/api/negocios/miembros?negocioId=n1",
    );
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("Dueño")).toBeInTheDocument();
  });

  it("muestra dueño y empleado cuando la API devuelve ambas membresías", async () => {
    miembrosPayload = {
      miembros: [
        {
          usuario_id: "u-owner",
          role: "owner",
          usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
        },
        {
          usuario_id: "u-emp",
          role: "employee",
          usuarios: { email: "empleado@example.com", nombre: "Gaétan", apellido: null },
        },
      ],
    };

    render(<NegocioInvitarEmpleado negocioId="n1" />);

    await waitFor(() => {
      expect(screen.getByText("empleado@example.com")).toBeInTheDocument();
    });
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("Dueño")).toBeInTheDocument();
    expect(screen.getByText("Empleado")).toBeInTheDocument();
  });

  it("refetch del equipo tras invitar empleado", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input
        : input instanceof URL ? input.toString()
        : input.url;
      const method = init?.method?.toUpperCase() ?? "GET";

      if (url.includes("/api/negocios/miembros") && method === "GET") {
        const count = fetchMock.mock.calls.filter(
          (call) => String(call[0]).includes("/api/negocios/miembros") && (call[1]?.method ?? "GET") === "GET",
        ).length;
        const miembros =
          count >= 2 ?
            [
              {
                usuario_id: "u-owner",
                role: "owner",
                usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
              },
              {
                usuario_id: "u-emp",
                role: "employee",
                usuarios: { email: "empleado@example.com", nombre: "Nuevo", apellido: null },
              },
            ]
          : [
              {
                usuario_id: "u-owner",
                role: "owner",
                usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
              },
            ];
        return new Response(JSON.stringify({ miembros }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    const user = userEvent.setup();
    render(<NegocioInvitarEmpleado negocioId="n1" />);

    await waitFor(() => {
      expect(screen.getByText("Ana López")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Correo/i), "empleado@ejemplo.com");
    await user.click(screen.getByRole("button", { name: /Agregar empleado/i }));

    await waitFor(() => {
      expect(screen.getByText("empleado@example.com")).toBeInTheDocument();
    });

    const getCalls = fetchMock.mock.calls.filter(
      (call) => String(call[0]).includes("/api/negocios/miembros") && (call[1]?.method ?? "GET") === "GET",
    );
    expect(getCalls.length).toBe(2);
  });
});
