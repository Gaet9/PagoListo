import { describe, expect, it } from "vitest";

import {
  buildPasswordRecoveryRedirectTo,
  getRecoverySessionExchangePath,
  hasImplicitRecoveryHash,
} from "@/lib/auth/password-recovery";

describe("password-recovery", () => {
  it("buildPasswordRecoveryRedirectTo apunta al callback con next", () => {
    expect(buildPasswordRecoveryRedirectTo("https://app.test")).toBe(
      "https://app.test/auth/callback?next=%2Fauth%2Fupdate-password",
    );
  });

  it("getRecoverySessionExchangePath redirige code al callback", () => {
    const params = new URLSearchParams("code=abc123");
    expect(getRecoverySessionExchangePath(params)).toBe(
      "/auth/callback?code=abc123&next=%2Fauth%2Fupdate-password",
    );
  });

  it("getRecoverySessionExchangePath redirige token_hash a confirm", () => {
    const params = new URLSearchParams(
      "token_hash=th&type=recovery",
    );
    expect(getRecoverySessionExchangePath(params)).toBe(
      "/auth/confirm?token_hash=th&type=recovery&next=%2Fauth%2Fupdate-password",
    );
  });

  it("hasImplicitRecoveryHash detecta fragmento de recuperación", () => {
    expect(
      hasImplicitRecoveryHash("#access_token=x&type=recovery"),
    ).toBe(true);
    expect(hasImplicitRecoveryHash("")).toBe(false);
  });
});
