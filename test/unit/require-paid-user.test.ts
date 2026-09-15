import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requirePaidUser, SUBSCRIPTION_PAYWALL_PATH } from "@/lib/auth/require-paid-user";

function createSupabaseMock({
  hasClaims,
  subscription,
}: {
  hasClaims: boolean;
  subscription?: { status: string; current_period_end: string | null; plan_code: string | null } | null;
}): SupabaseClient {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue({
        data: hasClaims ? { claims: { sub: "u1" } } : { claims: null },
      }),
    },
    from: vi.fn((table: string) => {
      if (table !== "suscripciones_usuario") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: subscription ?? null,
              error: null,
            }),
          }),
        }),
      };
    }),
  } as unknown as SupabaseClient;
}

describe("requirePaidUser", () => {
  const prevEnforce = process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;

  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "true";
  });

  afterEach(() => {
    if (prevEnforce === undefined) delete process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;
    else process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = prevEnforce;
  });

  it("redirects to login when unauthenticated", async () => {
    const supabase = createSupabaseMock({ hasClaims: false });
    await requirePaidUser(supabase);
    expect(redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("redirects to subscription paywall without active abono", async () => {
    const supabase = createSupabaseMock({
      hasClaims: true,
      subscription: { status: "inactive", current_period_end: null, plan_code: null },
    });
    await requirePaidUser(supabase);
    expect(redirect).toHaveBeenCalledWith(`${SUBSCRIPTION_PAYWALL_PATH}?requiere_abono=1`);
  });

  it("returns user id when subscription is active", async () => {
    const supabase = createSupabaseMock({
      hasClaims: true,
      subscription: {
        status: "active",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
      },
    });
    const res = await requirePaidUser(supabase);
    expect(redirect).not.toHaveBeenCalled();
    expect(res.userId).toBe("u1");
  });

  it("skips paywall when enforcement is disabled", async () => {
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "false";
    const supabase = createSupabaseMock({
      hasClaims: true,
      subscription: null,
    });
    const res = await requirePaidUser(supabase);
    expect(redirect).not.toHaveBeenCalled();
    expect(res.userId).toBe("u1");
  });
});
