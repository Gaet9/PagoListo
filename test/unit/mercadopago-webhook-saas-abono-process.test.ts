import { describe, expect, it, vi } from "vitest";

import { processSaasAbonoApprovedPayment } from "@/lib/mercadopago/webhook-saas-abono";

const INTENTO_ROW = {
  id: "0af8075c-f941-473c-a1be-58ca1ec398b1",
  usuario_id: "00a02929-8a9c-4383-8eb3-a69809e72a46",
  plan_code: "mensual",
  expected_total_ars: "100",
  mp_preference_id: "3349768256-9aa81056-792a-4542-8fd0-37ce00d56ec5",
  consumed_at: null,
  mp_payment_id: null,
};

function buildActivationMockAdmin() {
  const upsertRows: unknown[] = [];
  let claimUpdate: Record<string, unknown> | null = null;

  const intentoChain = {
    select: () => intentoChain,
    eq: () => intentoChain,
    is: () => intentoChain,
    order: () => intentoChain,
    limit: () => intentoChain,
    maybeSingle: async () => ({ data: INTENTO_ROW, error: null }),
    update: (payload: Record<string, unknown>) => {
      claimUpdate = payload;
      return {
        eq: () => ({
          is: () => ({
            is: () => ({
              select: () => ({
                maybeSingle: async () => ({ data: { id: INTENTO_ROW.id }, error: null }),
              }),
            }),
          }),
        }),
      };
    },
  };

  const subChain = {
    select: () => subChain,
    eq: () => subChain,
    maybeSingle: async () => ({ data: null, error: null }),
    upsert: async (row: unknown) => {
      upsertRows.push(row);
      return { error: null };
    },
  };

  const admin = {
    from: vi.fn((table: string) => {
      if (table === "mp_saas_abono_intentos") return intentoChain;
      if (table === "suscripciones_usuario") return subChain;
      throw new Error(`unexpected table ${table}`);
    }),
  };

  return { admin, upsertRows, getClaimUpdate: () => claimUpdate };
}

describe("processSaasAbonoApprovedPayment", () => {
  it("rejects amount mismatch before claim", async () => {
    const { admin } = buildActivationMockAdmin();
    const result = await processSaasAbonoApprovedPayment(admin as never, "pay-1", {
      status: "approved",
      external_reference: INTENTO_ROW.id,
      preference_id: INTENTO_ROW.mp_preference_id,
      transaction_amount: 50,
      metadata: {
        kind: "saas_abono",
        intento_id: INTENTO_ROW.id,
        usuario_id: INTENTO_ROW.usuario_id,
      },
    });

    expect(result).toEqual({ handled: true, reason: "amount_mismatch" });
  });

  it("activates subscription when approved payment matches expected_total 100", async () => {
    const { admin, upsertRows, getClaimUpdate } = buildActivationMockAdmin();

    const result = await processSaasAbonoApprovedPayment(admin as never, "58980959081", {
      status: "approved",
      external_reference: INTENTO_ROW.id,
      preference_id: INTENTO_ROW.mp_preference_id,
      transaction_amount: 100,
      metadata: {
        kind: "saas_abono",
        intento_id: INTENTO_ROW.id,
        usuario_id: INTENTO_ROW.usuario_id,
      },
    });

    expect(result).toEqual({ handled: true, reason: "activated" });
    expect(getClaimUpdate()).toMatchObject({
      mp_payment_id: "58980959081",
      consumed_at: expect.any(String),
    });
    expect(upsertRows).toHaveLength(1);
    expect(upsertRows[0]).toMatchObject({
      user_id: INTENTO_ROW.usuario_id,
      status: "active",
      plan_code: "mensual",
      canceled_at: null,
    });
  });

  it("rejects when metadata usuario_id does not match intento", async () => {
    const { admin } = buildActivationMockAdmin();
    const result = await processSaasAbonoApprovedPayment(admin as never, "pay-1", {
      status: "approved",
      external_reference: INTENTO_ROW.id,
      preference_id: INTENTO_ROW.mp_preference_id,
      transaction_amount: 100,
      metadata: {
        kind: "saas_abono",
        intento_id: INTENTO_ROW.id,
        usuario_id: "00000000-0000-0000-0000-000000000099",
      },
    });

    expect(result).toEqual({ handled: true, reason: "usuario_mismatch" });
  });
});
