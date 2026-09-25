import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { SuscripcionAbonoCheckout } from "@/components/perfil/suscripcion-abono-checkout";

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockWallet() {
      return <div data-testid="wallet-mock" />;
    };
  },
}));

describe("SuscripcionAbonoCheckout", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "pref-1" }),
      }),
    );
  });

  it("enables Pagar when amount label is set (e.g. QA 100 ARS)", () => {
    render(<SuscripcionAbonoCheckout amountLabel="$ 100,00" />);
    expect(screen.getByRole("button", { name: /pagar abono/i })).toBeEnabled();
  });

  it("starts checkout with server-side plan body and scoped negocioId", async () => {
    render(<SuscripcionAbonoCheckout amountLabel="$ 4.999,00" negocioId="negocio-b" />);
    fireEvent.click(screen.getByRole("button", { name: /pagar abono/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/mercadopago/saas/preference",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ plan: "mensual", negocioId: "negocio-b" }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("wallet-mock")).toBeInTheDocument();
    });
  });
});
