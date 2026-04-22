import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import { requirePaidUser } from "@/lib/auth/require-paid-user";

function createSupabaseMock({ hasClaims }: { hasClaims: boolean }) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue({
        data: hasClaims ? { claims: { sub: "u1" } } : { claims: null },
      }),
    },
  } as any;
}

describe("requirePaidUser", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
  });

  it("redirects to login when unauthenticated", async () => {
    const supabase = createSupabaseMock({ hasClaims: false });
    await requirePaidUser(supabase);
    expect(redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("returns user id when authenticated", async () => {
    const supabase = createSupabaseMock({ hasClaims: true });
    const res = await requirePaidUser(supabase);
    expect(redirect).not.toHaveBeenCalled();
    expect(res.userId).toBe("u1");
  });
});
