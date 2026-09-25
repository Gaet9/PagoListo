import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/negocio/active-negocio-context.server", () => ({
  readActiveNegocioIdFromRequestCookies: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/queries/negocios", () => ({
  listNegocios: vi.fn(),
}));

import { isSaasAbonoManageAllowedForApi } from "@/lib/auth/saas-abono-access.server";
import { listNegocios } from "@/lib/queries/negocios";

describe("isSaasAbonoManageAllowedForApi", () => {
  it("denies cookie employee context without body even if manager elsewhere", async () => {
    vi.mocked(listNegocios).mockResolvedValue({
      data: [{ id: "qa-smoke", nombre: "QA", localizacion: null }],
      error: null,
    } as Awaited<ReturnType<typeof listNegocios>>);

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

    await expect(isSaasAbonoManageAllowedForApi(supabase, "dual", undefined)).resolves.toBe(false);
  });

  it("allows body negocioId when user is manager on that id", async () => {
    vi.mocked(listNegocios).mockResolvedValue({
      data: [
        { id: "qa-smoke", nombre: "QA", localizacion: null },
        { id: "own-shop", nombre: "Own", localizacion: null },
      ],
      error: null,
    } as Awaited<ReturnType<typeof listNegocios>>);

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
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    } as unknown as SupabaseClient;

    await expect(isSaasAbonoManageAllowedForApi(supabase, "dual", "own-shop")).resolves.toBe(true);
  });
});
