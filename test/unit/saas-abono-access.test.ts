import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { userCanManageSaasAbonoInContext } from "@/lib/auth/saas-abono-access";

describe("userCanManageSaasAbonoInContext", () => {
  it("allows abono when the user has no negocios (cuenta nueva)", async () => {
    const supabase = {} as SupabaseClient;
    await expect(
      userCanManageSaasAbonoInContext(supabase, "u1", { negocioIds: [], activeNegocioId: null }),
    ).resolves.toBe(true);
  });

  it("denies when the active negocio membership is employee", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "employee" }, error: null }),
            }),
          }),
        }),
      })),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    await expect(
      userCanManageSaasAbonoInContext(supabase, "u1", {
        negocioIds: ["qa-smoke"],
        activeNegocioId: "qa-smoke",
      }),
    ).resolves.toBe(false);
  });

  it("allows when the active negocio membership is admin", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
            }),
          }),
        }),
      })),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    await expect(
      userCanManageSaasAbonoInContext(supabase, "u1", {
        negocioIds: ["own-shop"],
        activeNegocioId: "own-shop",
      }),
    ).resolves.toBe(true);
  });

  it("denies employee context even if the user is manager in another negocio (dual-role)", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role: "employee" }, error: null }),
            }),
          }),
        }),
      })),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    await expect(
      userCanManageSaasAbonoInContext(supabase, "dual-user", {
        negocioIds: ["qa-smoke", "own-shop"],
        activeNegocioId: "qa-smoke",
      }),
    ).resolves.toBe(false);
  });
});
