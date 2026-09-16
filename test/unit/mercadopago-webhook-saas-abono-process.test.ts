import { describe, expect, it, vi } from "vitest";

import { processSaasAbonoApprovedPayment } from "@/lib/mercadopago/webhook-saas-abono";

type TableHandlers = {
  select?: () => unknown;
  update?: () => unknown;
  upsert?: () => unknown;
};

function createMockAdmin(tables: Record<string, TableHandlers>) {
  const from = vi.fn((table: string) => {
    const handlers = tables[table];
    if (!handlers) {
      throw new Error(`unexpected table ${table}`);
    }
    const chain: Record<string, unknown> = {};
    const terminal = { data: null as unknown, error: null as unknown };
    const makeThenable = (obj: Record<string, unknown>) => {
      obj.then = (resolve: (v: unknown) => void) => resolve(terminal);
      return obj;
    };
    chain.select = () => {
      handlers.select?.();
      return makeThenable(chain);
    };
    chain.eq = () => chain;
    chain.is = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.maybeSingle = async () => handlers.select?.() ?? terminal;
    chain.update = () => {
      handlers.update?.();
      return makeThenable({
        eq: () => ({
          is: () => ({
            select: () => ({
              maybeSingle: async () => handlers.update?.() ?? { data: { id: "intento-1" }, error: null },
            }),
          }),
        }),
      });
    };
    chain.upsert = async () => handlers.upsert?.() ?? { error: null };
    return chain;
  });
  return { from };
}

describe("processSaasAbonoApprovedPayment", () => {
  it("rejects amount mismatch before claim", async () => {
    const admin = createMockAdmin({
      mp_saas_abono_intentos: {
        select: () => ({
          data: {
            id: "intento-1",
            usuario_id: "user-1",
            plan_code: "mensual",
            expected_total_ars: 100,
            mp_preference_id: "pref-1",
            consumed_at: null,
            mp_payment_id: null,
          },
          error: null,
        }),
      },
    });

    const result = await processSaasAbonoApprovedPayment(admin as never, "pay-1", {
      status: "approved",
      external_reference: "intento-1",
      preference_id: "pref-1",
      transaction_amount: 50,
      metadata: { kind: "saas_abono", intento_id: "intento-1" },
    });

    expect(result).toEqual({ handled: true, reason: "amount_mismatch" });
  });

});
