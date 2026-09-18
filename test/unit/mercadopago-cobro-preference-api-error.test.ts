import { describe, expect, it } from "vitest";

import { mercadoPagoCobroPreferenceErrorMessage } from "@/lib/mercadopago/cobro-preference-api-error";

describe("mercadoPagoCobroPreferenceErrorMessage", () => {
  it("maps invalid access token to reconnect message", () => {
    const msg = mercadoPagoCobroPreferenceErrorMessage("invalid access token", 401);
    expect(msg).toMatch(/expiró|vincular/i);
  });

  it("passes through short known server messages", () => {
    expect(mercadoPagoCobroPreferenceErrorMessage("Mercado Pago no está conectado para este negocio")).toContain(
      "conectado",
    );
  });
});
