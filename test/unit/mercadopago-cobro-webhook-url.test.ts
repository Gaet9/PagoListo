import { describe, expect, it } from "vitest";

import { parseMercadoPagoCobroWebhookHints } from "@/lib/mercadopago/cobro-webhook-url";

describe("parseMercadoPagoCobroWebhookHints", () => {
  it("parses valid UUID hints", () => {
    const negocioId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const intentoId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
    const params = new URLSearchParams({ negocio_id: negocioId, intento_id: intentoId });
    expect(parseMercadoPagoCobroWebhookHints(params)).toEqual({ negocioId, intentoId });
  });

  it("ignores invalid ids", () => {
    const params = new URLSearchParams({ negocio_id: "not-a-uuid", intento_id: "" });
    expect(parseMercadoPagoCobroWebhookHints(params)).toEqual({ negocioId: null, intentoId: null });
  });
});
