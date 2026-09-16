import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { ConfiguracionTab } from "@/components/tienda/configuracion-tab";

describe("ConfiguracionTab", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
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

    it("muestra CTA de conexión y pasos", async () => {
        render(<ConfiguracionTab negocioId='n1' />);
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Conectar con Mercado Pago/i })).toBeInTheDocument();
        });
        expect(screen.getByText(/Tocá «Conectar con Mercado Pago»/i)).toBeInTheDocument();
    });

    it("muestra cuenta vinculada con email", async () => {
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
        expect(screen.getByRole("button", { name: /Cambiar cuenta/i })).toBeInTheDocument();
    });
});
