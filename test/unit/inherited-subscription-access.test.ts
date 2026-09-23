import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { userHasEffectivePaidAccess } from "@/lib/auth/inherited-subscription-access";

function createSupabaseMock({
  subscription,
  subscriptionError,
  inherited,
  inheritError,
}: {
  subscription?: { status: string; current_period_end: string | null; plan_code: string | null } | null;
  subscriptionError?: string | null;
  inherited?: boolean;
  inheritError?: string | null;
}): SupabaseClient {
  return {
    from: vi.fn((table: string) => {
      if (table !== "suscripciones_usuario") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: subscription ?? null,
              error: subscriptionError ? { message: subscriptionError } : null,
            }),
          }),
        }),
      };
    }),
    rpc: vi.fn().mockResolvedValue({
      data: inherited ?? false,
      error: inheritError ? { message: inheritError } : null,
    }),
  } as unknown as SupabaseClient;
}

describe("userHasEffectivePaidAccess", () => {
  const prevEnforce = process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;

  beforeEach(() => {
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "true";
  });

  afterEach(() => {
    if (prevEnforce === undefined) delete process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;
    else process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = prevEnforce;
  });

  it("returns true with own active subscription without calling inherit RPC", async () => {
    const supabase = createSupabaseMock({
      subscription: {
        status: "active",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
      },
    });
    await expect(userHasEffectivePaidAccess(supabase, "u1")).resolves.toBe(true);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("returns true via inherited owner subscription", async () => {
    const supabase = createSupabaseMock({
      subscription: { status: "inactive", current_period_end: null, plan_code: null },
      inherited: true,
    });
    await expect(userHasEffectivePaidAccess(supabase, "emp1")).resolves.toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("has_active_subscription_via_negocio_owner");
  });

  it("returns false when neither own nor inherited access", async () => {
    const supabase = createSupabaseMock({
      subscription: { status: "inactive", current_period_end: null, plan_code: null },
      inherited: false,
    });
    await expect(userHasEffectivePaidAccess(supabase, "emp1")).resolves.toBe(false);
  });
});
