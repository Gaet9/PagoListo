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

  it("starts checkout with server-side plan body", async () => {
    render(<SuscripcionAbonoCheckout amountLabel="$ 4.999,00" />);
    fireEvent.click(screen.getByRole("button", { name: /pagar abono/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/mercadopago/saas/preference",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ plan: "mensual" }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("wallet-mock")).toBeInTheDocument();
    });
  });
});
