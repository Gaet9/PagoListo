import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { userHasNegocioManagerRole } from "@/lib/auth/negocio-manager-role";

describe("userHasNegocioManagerRole", () => {
  it("returns true when RPC confirms manager role", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown as SupabaseClient;
    await expect(userHasNegocioManagerRole(supabase, "n1")).resolves.toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith("has_negocio_role", {
      p_negocio_id: "n1",
      p_roles: ["owner", "admin"],
    });
  });

  it("returns false on RPC error", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: { message: "fail" } }),
    } as unknown as SupabaseClient;
    await expect(userHasNegocioManagerRole(supabase, "n1")).resolves.toBe(false);
  });
});
