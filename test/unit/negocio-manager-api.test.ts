import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { denyUnlessSaasManager } from "@/lib/auth/negocio-manager-api";

vi.mock("@/lib/auth/saas-abono-access.server", () => ({
  isSaasAbonoManageAllowedForApi: vi.fn(),
}));

import { isSaasAbonoManageAllowedForApi } from "@/lib/auth/saas-abono-access.server";

describe("denyUnlessSaasManager (GAE-17)", () => {
  it("returns 403 when API access check fails", async () => {
    vi.mocked(isSaasAbonoManageAllowedForApi).mockResolvedValue(false);
    const supabase = {} as SupabaseClient;
    const res = await denyUnlessSaasManager(supabase, "u1", "negocio-a");
    expect(res?.status).toBe(403);
  });

  it("allows when API access check passes (cookie and/or body scope)", async () => {
    vi.mocked(isSaasAbonoManageAllowedForApi).mockResolvedValue(true);
    const supabase = {} as SupabaseClient;
    const res = await denyUnlessSaasManager(supabase, "u1", undefined);
    expect(res).toBeNull();
    expect(isSaasAbonoManageAllowedForApi).toHaveBeenCalledWith(supabase, "u1", undefined);
  });
});
