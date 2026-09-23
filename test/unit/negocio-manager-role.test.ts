import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  userCanManageSaasSubscription,
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

describe("userCanManageSaasSubscription", () => {
  it("allows owner/admin membership", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [{ negocio_id: "n1" }], error: null }),
            }),
            limit: vi.fn(),
          }),
        }),
      })),
    } as unknown as SupabaseClient;
    await expect(userCanManageSaasSubscription(supabase, "u1")).resolves.toBe(true);
  });

  it("denies employee-only membership", async () => {
    const from = vi.fn((table: string) => {
      if (table === "negocio_usuarios") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => ({
              in: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
              limit: vi.fn().mockResolvedValue({ data: [{ negocio_id: "n1" }], error: null }),
            })),
          }),
        };
      }
      if (table === "negocios") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    });
    const supabase = { from } as unknown as SupabaseClient;
    await expect(userCanManageSaasSubscription(supabase, "emp1")).resolves.toBe(false);
  });

  it("allows users without negocio (nueva cuenta)", async () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }));
    const supabase = { from } as unknown as SupabaseClient;
    await expect(userCanManageSaasSubscription(supabase, "new")).resolves.toBe(true);
  });
});
