import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { cancelUserSubscription } from "@/lib/auth/cancel-user-subscription";

function createAdminMock(sequence: {
  selectRow: Record<string, unknown> | null;
  updateRow?: Record<string, unknown> | null;
  updateError?: boolean;
}): SupabaseClient {
  let updateCalled = false;
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(async () => {
            if (!updateCalled) {
              return { data: sequence.selectRow, error: null };
            }
            return {
              data: sequence.updateRow ?? sequence.selectRow,
              error: sequence.updateError ? { message: "fail" } : null,
            };
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockImplementation(async () => {
            updateCalled = true;
            return {
              data: sequence.updateRow ?? null,
              error: sequence.updateError ? { message: "fail" } : null,
            };
          }),
        }),
      }),
    })),
  } as unknown as SupabaseClient;
}

describe("cancelUserSubscription", () => {
  it("cancels an active subscription with future period", async () => {
    const admin = createAdminMock({
      selectRow: {
        status: "active",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
        canceled_at: null,
      },
      updateRow: {
        status: "canceled",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
        canceled_at: "2026-06-01T00:00:00.000Z",
      },
    });

    const result = await cancelUserSubscription(admin, "user-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.status).toBe("canceled");
    }
  });

  it("is idempotent when already canceled but still in period", async () => {
    const admin = createAdminMock({
      selectRow: {
        status: "canceled",
        current_period_end: "2099-01-01T00:00:00.000Z",
        plan_code: "mensual",
        canceled_at: "2026-05-01T00:00:00.000Z",
      },
    });

    const result = await cancelUserSubscription(admin, "user-1");
    expect(result.ok).toBe(true);
  });

  it("rejects when there is no active access", async () => {
    const admin = createAdminMock({
      selectRow: {
        status: "inactive",
        current_period_end: null,
        plan_code: null,
        canceled_at: null,
      },
    });

    const result = await cancelUserSubscription(admin, "user-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_access");
  });
});
