import { describe, expect, it, vi } from "vitest";

import { revokeMercadoPagoAuthorizationBestEffort } from "@/lib/mercadopago/oauth-revoke-best-effort";

describe("revokeMercadoPagoAuthorizationBestEffort", () => {
  it("returns false when mp_user_id is missing", async () => {
    const ok = await revokeMercadoPagoAuthorizationBestEffort({
      accessToken: "tok",
      mpUserId: null,
      clientId: "app-123",
    });
    expect(ok).toBe(false);
  });

  it("calls MP users/applications DELETE when mp_user_id is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const ok = await revokeMercadoPagoAuthorizationBestEffort({
      accessToken: "seller-token",
      mpUserId: 999,
      clientId: "app-123",
    });

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/users/999/applications/app-123",
      expect.objectContaining({ method: "DELETE" }),
    );

    vi.unstubAllGlobals();
  });
});
