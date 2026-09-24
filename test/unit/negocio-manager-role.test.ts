import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  userCanManageSaasForScopedNegocio,
  userHasNegocioManagerRole,
} from "@/lib/auth/negocio-manager-role";

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

describe("userCanManageSaasForScopedNegocio", () => {
  it("allows manager on scoped negocio only", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown as SupabaseClient;
    await expect(userCanManageSaasForScopedNegocio(supabase, "n-b", "u1")).resolves.toBe(true);
  });

  it("denies employee context even if user owns another store", async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      })),
    } as unknown as SupabaseClient;
    await expect(userCanManageSaasForScopedNegocio(supabase, "n-employee", "u1")).resolves.toBe(false);
  });
});
