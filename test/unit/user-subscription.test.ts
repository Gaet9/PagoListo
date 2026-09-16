import { describe, it, expect, afterEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeNextSubscriptionPeriodEnd,
  fetchUserSubscription,
  isActiveSubscription,
  isSubscriptionEnforcementEnabled,
} from "@/lib/auth/user-subscription";

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

    const row = await fetchUserSubscription(supabase, "user-1");
    expect(row).toEqual({
      status: "active",
      current_period_end: "2099-01-01T00:00:00.000Z",
      plan_code: null,
      canceled_at: null,
    });
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
