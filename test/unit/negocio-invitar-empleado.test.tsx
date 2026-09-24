import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NegocioInvitarEmpleado } from "@/components/tienda/negocio-invitar-empleado";

describe("NegocioInvitarEmpleado", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string" ? input
        : input instanceof URL ? input.toString()
        : input.url;
      const method = init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");

      if (url.includes("/api/negocios/miembros") && method === "GET") {
        return new Response(
          JSON.stringify({
            miembros: [
              {
                usuario_id: "u-owner",
                role: "owner",
                usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/api/negocios/miembros") && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (typeof originalFetch === "function") return originalFetch(input, init);
      return new Response("not found", { status: 404 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("muestra miembros del equipo al cargar", async () => {
    render(<NegocioInvitarEmpleado negocioId="n1" />);

    await waitFor(() => {
      expect(screen.getByText("Ana López")).toBeInTheDocument();
    });
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText("Dueño")).toBeInTheDocument();
  });

  it("vuelve a cargar el equipo después de invitar", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    let getCalls = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string" ? input
        : input instanceof URL ? input.toString()
        : input.url;
      const method = init?.method ?? "GET";

      if (url.includes("/api/negocios/miembros") && method === "GET") {
        getCalls += 1;
        const miembros =
          getCalls >= 2 ?
            [
              {
                usuario_id: "u-owner",
                role: "owner",
                usuarios: { email: "owner@example.com", nombre: "Ana", apellido: "López" },
              },
              {
                usuario_id: "u-emp",
                role: "employee",
                usuarios: { email: "empleado@ejemplo.com", nombre: "Juan", apellido: null },
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

      if (url.includes("/api/negocios/miembros") && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
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
      expect(screen.getByText("Juan")).toBeInTheDocument();
    });
    expect(screen.getByText("Empleado")).toBeInTheDocument();
    expect(getCalls).toBeGreaterThanOrEqual(2);
  });
});
