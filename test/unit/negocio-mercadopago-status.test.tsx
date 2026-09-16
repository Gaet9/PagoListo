import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { NegocioMercadoPagoStatus } from "@/components/perfil/negocio-mercadopago-status";

describe("NegocioMercadoPagoStatus", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        globalThis.fetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
            const url =
                typeof input === "string" ? input
                : input instanceof URL ? input.toString()
                : input.url;
            if (url.includes("/api/mercadopago/oauth/status")) {
                return new Response(
                    JSON.stringify({
                        connected: true,
                        mp_user_id: 3349768256,
                        account_label: "seller@example.com",
                        account_email: "seller@example.com",
                        account_nickname: null,
                    }),
                    { status: 200, headers: { "Content-Type": "application/json" } },
                );
            }
            if (typeof originalFetch === "function") return originalFetch(input);
            return new Response("not found", { status: 404 });
        }) as typeof fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("muestra conectado, email e ID MP", async () => {
        render(<NegocioMercadoPagoStatus negocioId='n1' configuracionHref='/tiendas/foo?tab=configuracion' />);

        await waitFor(() => {
            expect(screen.getByText(/Vinculado para cobrar/i)).toBeInTheDocument();
        });
        expect(screen.getByText("seller@example.com")).toBeInTheDocument();
        expect(screen.getByText(/3349768256/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Configuración de la tienda/i })).toHaveAttribute(
            "href",
            "/tiendas/foo?tab=configuracion",
        );
    });

    it("muestra botón conectar cuando no hay cuenta", async () => {
        globalThis.fetch = vi.fn(async (): Promise<Response> => {
            return new Response(JSON.stringify({ connected: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }) as typeof fetch;

        render(<NegocioMercadoPagoStatus negocioId='n1' configuracionHref='/tiendas/foo?tab=configuracion' />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Conectar Mercado Pago/i })).toBeInTheDocument();
        });
    });
});
