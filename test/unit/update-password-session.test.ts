import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  hasImplicitRecoveryHash,
  RECOVERY_SESSION_MISSING_MESSAGE,
} from "@/lib/auth/password-recovery";
import {
  resolveUpdatePasswordSession,
  stripRecoveryParamsFromUrl,
  tryClientRecoveryCodeExchange,
} from "@/lib/auth/update-password-session";

describe("update-password-session", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/auth/update-password");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stripRecoveryParamsFromUrl elimina code y hash de recuperación", () => {
    window.history.replaceState(
      {},
      "",
      "/auth/update-password?code=abc&type=recovery#access_token=x&type=recovery",
    );
    stripRecoveryParamsFromUrl();
    expect(window.location.pathname).toBe("/auth/update-password");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
  });

  it("tryClientRecoveryCodeExchange intercambia code en el cliente", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
    });
    const supabase = {
      auth: { exchangeCodeForSession, getSession, getUser: vi.fn() },
    };

    window.history.replaceState({}, "", "/auth/update-password?code=pkce-code");

    const ok = await tryClientRecoveryCodeExchange(
      supabase as never,
      new URLSearchParams("code=pkce-code"),
    );

    expect(ok).toBe(true);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(window.location.search).toBe("");
  });

  it("resolveUpdatePasswordSession sin sesión devuelve error", async () => {
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        exchangeCodeForSession: vi.fn(),
      },
    };

    const result = await resolveUpdatePasswordSession(
      supabase as never,
      { search: "", hash: "" },
    );

    expect(result).toEqual({
      kind: "error",
      message: RECOVERY_SESSION_MISSING_MESSAGE,
    });
  });

  it("hasImplicitRecoveryHash detecta access_token sin type", () => {
    expect(hasImplicitRecoveryHash("#access_token=abc&refresh_token=def")).toBe(
      true,
    );
  });
});
