import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { ConfiguracionTab } from "@/components/tienda/configuracion-tab";

const { listNegocioMiembrosMock } = vi.hoisted(() => ({
  listNegocioMiembrosMock: vi.fn(async () => ({ data: [], error: null })),
}));

vi.mock("@/lib/queries/negocio-usuarios", () => ({
  listNegocioMiembros: (...args: unknown[]) => listNegocioMiembrosMock(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

describe("ConfiguracionTab", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        listNegocioMiembrosMock.mockReset();
        listNegocioMiembrosMock.mockResolvedValue({ data: [], error: null });

        globalThis.fetch = vi.fn(async (): Promise<Response> => {
            return new Response(
                JSON.stringify({
                    connected: false,
                    mp_user_id: null,
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("muestra CTA de conexión sin pasos explicativos", async () => {
        render(<ConfiguracionTab negocioId='n1' />);
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /^Vincular$/i })).toBeInTheDocument();
        });
        expect(screen.queryByText(/Tocá «Conectar/i)).not.toBeInTheDocument();
    });

    it("muestra cuenta vinculada con Desvincular", async () => {
        globalThis.fetch = vi.fn(async (): Promise<Response> => {
            return new Response(
                JSON.stringify({
                    connected: true,
                    mp_user_id: 99,
                    account_email: "kiosco@example.com",
                }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }) as typeof fetch;

        render(<ConfiguracionTab negocioId='n1' />);
        await waitFor(() => {
            expect(screen.getByText("kiosco@example.com")).toBeInTheDocument();
        });
        expect(screen.getByText(/99/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Desvincular/i })).toBeInTheDocument();
        expect(screen.getByText("Vinculada")).toBeInTheDocument();
    });
});
