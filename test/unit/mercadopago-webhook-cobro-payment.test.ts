import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listNegocioIdsForCobroPaymentFetch } from "@/lib/mercadopago/webhook-cobro-payment";

function mockAdmin(intentoNegocioId: string | null, oauthIds: string[]) {
  return {
    from: (table: string) => {
      if (table === "mp_cobro_intentos") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: intentoNegocioId ? { negocio_id: intentoNegocioId } : null,
              }),
            }),
          }),
        };
      }
      if (table === "negocio_mercadopago_oauth") {
        return {
          select: () => ({
            limit: async () => ({
              data: oauthIds.map((id) => ({ negocio_id: id })),
              error: null,
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("listNegocioIdsForCobroPaymentFetch", () => {
  it("prioritizes negocio from intento hint", async () => {
    const intentoId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
    const fromIntento = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const other = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
    const admin = mockAdmin(fromIntento, [other, fromIntento]);
    const ids = await listNegocioIdsForCobroPaymentFetch(admin as never, {
      negocioId: fromIntento,
      intentoId,
    });
    expect(ids[0]).toBe(fromIntento);
    expect(ids).toContain(other);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to oauth list when no hints", async () => {
    const a = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const b = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
    const admin = mockAdmin(null, [a, b]);
    const ids = await listNegocioIdsForCobroPaymentFetch(admin as never, { negocioId: null, intentoId: null });
    expect(ids).toEqual([a, b]);
  });
});
