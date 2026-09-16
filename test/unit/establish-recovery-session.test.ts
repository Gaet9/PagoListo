import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  establishRecoverySession,
  RECOVERY_EXCHANGE_ATTEMPT_STORAGE_KEY,
  stripRecoveryParamsFromBrowserUrl,
} from "@/lib/auth/establish-recovery-session";

describe("establish-recovery-session", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/auth/update-password");
  });

  it("intercambia code en cliente y limpia la URL", async () => {
    const exchangeMock = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      auth: { exchangeCodeForSession: exchangeMock },
    };

    window.history.replaceState(
      {},
      "",
      "/auth/update-password?code=pkce-code",
    );

    const outcome = await establishRecoverySession(
      supabase as never,
      new URLSearchParams("code=pkce-code"),
      "",
    );

    expect(outcome).toEqual({ kind: "ready" });
    expect(exchangeMock).toHaveBeenCalledWith("pkce-code");
    expect(window.location.pathname).toBe("/auth/update-password");
    expect(window.location.search).toBe("");
  });

  it("sugiere redirect al callback si el intercambio en cliente falla", async () => {
    const exchangeMock = vi.fn().mockResolvedValue({
      error: { message: "invalid" },
    });
    const supabase = {
      auth: { exchangeCodeForSession: exchangeMock },
    };

    const outcome = await establishRecoverySession(
      supabase as never,
      new URLSearchParams("code=retry-code"),
      "",
    );

    expect(outcome.kind).toBe("redirect");
    if (outcome.kind === "redirect") {
      expect(outcome.path).toContain("/auth/callback");
      expect(outcome.path).toContain("retry-code");
    }
    expect(sessionStorage.getItem(RECOVERY_EXCHANGE_ATTEMPT_STORAGE_KEY)).toBe(
      "retry-code",
    );
  });

  it("no reintenta redirect en bucle si el code ya se intentó", async () => {
    sessionStorage.setItem(RECOVERY_EXCHANGE_ATTEMPT_STORAGE_KEY, "loop-code");
    const exchangeMock = vi.fn().mockResolvedValue({
      error: { message: "invalid" },
    });
    const supabase = {
      auth: { exchangeCodeForSession: exchangeMock },
    };

    const outcome = await establishRecoverySession(
      supabase as never,
      new URLSearchParams("code=loop-code"),
      "",
    );

    expect(outcome.kind).toBe("error");
  });

  it("stripRecoveryParamsFromBrowserUrl elimina query de recuperación", () => {
    window.history.replaceState(
      {},
      "",
      "/auth/update-password?code=x&type=recovery&foo=bar",
    );
    stripRecoveryParamsFromBrowserUrl();
    expect(window.location.pathname).toBe("/auth/update-password");
    expect(window.location.search).toBe("?foo=bar");
  });
});
