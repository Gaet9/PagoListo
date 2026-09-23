import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useNegocioRole } from "@/lib/hooks/use-negocio-role";

const getUserMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => getUserMock() },
    from: (...args: unknown[]) => fromMock(...args),
  }),
}));

describe("useNegocioRole", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
  });

  it("expone isManager para owner y falla cerrado sin fila", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { role: "owner" }, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useNegocioRole("n1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isManager).toBe(true);
    expect(result.current.isEmployee).toBe(false);
  });

  it("expone isEmployee y no manager para employee", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { role: "employee" }, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useNegocioRole("n1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isManager).toBe(false);
    expect(result.current.isEmployee).toBe(true);
  });
});
