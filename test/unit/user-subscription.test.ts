import { describe, it, expect, afterEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeNextSubscriptionPeriodEnd,
  fetchUserSubscription,
  isActiveSubscription,
  isSubscriptionEnforcementEnabled,
  userHasActiveSubscription,
} from "@/lib/auth/user-subscription";

function createSubscriptionSupabaseMock(result: {
  data: unknown;
  error: { message: string } | null;
}): SupabaseClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(result),
        }),
      }),
    })),
  } as unknown as SupabaseClient;
}

describe("isSubscriptionEnforcementEnabled", () => {
  const prev = process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;
    } else {
      process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = prev;
    }
  });

  it("defaults to enforced", () => {
    delete process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;
    expect(isSubscriptionEnforcementEnabled()).toBe(true);
  });

  it("can be disabled for local dev", () => {
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "false";
    expect(isSubscriptionEnforcementEnabled()).toBe(false);
  });
});

describe("isActiveSubscription", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("is false without row", () => {
    expect(isActiveSubscription(null, now)).toBe(false);
  });

  it("is true when active and period end is in the future", () => {
    expect(
      isActiveSubscription(
        { status: "active", current_period_end: "2026-07-01T00:00:00.000Z", plan_code: "mensual" },
        now,
      ),
    ).toBe(true);
  });

  it("is false when period ended", () => {
    expect(
      isActiveSubscription(
        { status: "active", current_period_end: "2026-05-01T00:00:00.000Z", plan_code: "mensual" },
        now,
      ),
    ).toBe(false);
  });

  it("is true when canceled but period not ended", () => {
    expect(
      isActiveSubscription(
        {
          status: "canceled",
          current_period_end: "2026-07-01T00:00:00.000Z",
          plan_code: "mensual",
          canceled_at: "2026-06-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("fetchUserSubscription", () => {
  it("falls back to core columns when plan_code is missing in the database", async () => {
    const coreRow = {
      status: "active",
      current_period_end: "2099-01-01T00:00:00.000Z",
    };
    const from = vi.fn(() => ({
      select: vi.fn((columns: string) => {
        if (columns.includes("plan_code")) {
          return {
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'column "plan_code" does not exist', code: "42703" },
              }),
            }),
          };
        }
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: coreRow, error: null }),
          }),
        };
      }),
    }));
    const supabase = { from } as unknown as SupabaseClient;

    const result = await fetchUserSubscription(supabase, "user-1");
    expect(result.error).toBeNull();
    expect(result.row).toEqual({
      status: "active",
      current_period_end: "2099-01-01T00:00:00.000Z",
      plan_code: null,
      canceled_at: null,
    });
  });

  it("returns error message instead of throwing on query failure", async () => {
    const supabase = createSubscriptionSupabaseMock({
      data: null,
      error: { message: "permission denied for table suscripciones_usuario" },
    });
    const result = await fetchUserSubscription(supabase, "u1");
    expect(result).toEqual({
      row: null,
      error: "permission denied for table suscripciones_usuario",
    });
  });

  it("returns error when supabase client throws", async () => {
    const supabase = {
      from: vi.fn(() => {
        throw new Error("boom");
      }),
    } as unknown as SupabaseClient;
    const result = await fetchUserSubscription(supabase, "u1");
    expect(result.row).toBeNull();
    expect(result.error).toBe("boom");
  });

  it("returns row when query succeeds", async () => {
    const supabase = createSubscriptionSupabaseMock({
      data: {
        status: "active",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
      },
      error: null,
    });
    const result = await fetchUserSubscription(supabase, "u1");
    expect(result.error).toBeNull();
    expect(result.row?.status).toBe("active");
  });
});

describe("userHasActiveSubscription", () => {
  const prevEnforce = process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;

  afterEach(() => {
    if (prevEnforce === undefined) delete process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;
    else process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = prevEnforce;
  });

  it("returns false when subscription query fails (middleware must not throw)", async () => {
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "true";
    const supabase = createSubscriptionSupabaseMock({
      data: null,
      error: { message: "permission denied" },
    });
    await expect(userHasActiveSubscription(supabase, "u1")).resolves.toBe(false);
  });

  it("returns false when fetch throws unexpectedly", async () => {
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "true";
    const supabase = {
      from: vi.fn(() => {
        throw new Error("network down");
      }),
    } as unknown as SupabaseClient;
    await expect(userHasActiveSubscription(supabase, "u1")).resolves.toBe(false);
  });
});

describe("computeNextSubscriptionPeriodEnd", () => {
  it("extends from existing end when still valid", () => {
    const from = new Date("2026-06-01T00:00:00.000Z");
    const existing = new Date("2026-08-01T00:00:00.000Z");
    const next = computeNextSubscriptionPeriodEnd(existing, from);
    expect(next.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("starts from now when period expired", () => {
    const from = new Date("2026-06-15T00:00:00.000Z");
    const existing = new Date("2026-05-01T00:00:00.000Z");
    const next = computeNextSubscriptionPeriodEnd(existing, from);
    expect(next.toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });
});
