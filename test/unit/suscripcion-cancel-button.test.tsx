import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SuscripcionCancelButton } from "@/components/perfil/suscripcion-cancel-button";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("SuscripcionCancelButton", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "canceled" }),
      }),
    );
  });

  it("calls cancel API on confirm", async () => {
    const user = userEvent.setup();
    render(<SuscripcionCancelButton accessUntilLabel="1 ene 2099" negocioId="negocio-b" />);

    await user.click(screen.getByRole("button", { name: /Cancelar suscripción/i }));
    await user.click(screen.getByRole("button", { name: /Confirmar cancelación/i }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/subscription/cancel",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ negocioId: "negocio-b" }),
      }),
    );
  });
});
