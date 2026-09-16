import { describe, expect, it } from "vitest";

import {
  buildPasswordRecoveryRedirectTo,
  getRecoverySessionExchangePath,
  getRecoveryTokenHashFromSearchParams,
  hasImplicitRecoveryHash,
  hasPendingRecoveryExchangeInUrl,
} from "@/lib/auth/password-recovery";

describe("password-recovery", () => {
  it("buildPasswordRecoveryRedirectTo apunta a update-password sin query", () => {
    expect(buildPasswordRecoveryRedirectTo("https://app.test")).toBe(
      "https://app.test/auth/update-password",
    );
    expect(buildPasswordRecoveryRedirectTo("https://app.test/")).toBe(
      "https://app.test/auth/update-password",
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

  it("getRecoveryTokenHashFromSearchParams lee token_hash y type", () => {
    const params = new URLSearchParams("token_hash=th&type=recovery");
    expect(getRecoveryTokenHashFromSearchParams(params)).toEqual({
      tokenHash: "th",
      type: "recovery",
    });
    expect(getRecoveryTokenHashFromSearchParams(new URLSearchParams())).toBeNull();
  });

  it("hasPendingRecoveryExchangeInUrl detecta code, token_hash o hash", () => {
    expect(
      hasPendingRecoveryExchangeInUrl(
        new URLSearchParams("code=abc"),
        "",
      ),
    ).toBe(true);
    expect(
      hasPendingRecoveryExchangeInUrl(
        new URLSearchParams("token_hash=t&type=recovery"),
        "",
      ),
    ).toBe(true);
    expect(
      hasPendingRecoveryExchangeInUrl(
        new URLSearchParams(),
        "#type=recovery&access_token=x",
      ),
    ).toBe(true);
    expect(
      hasPendingRecoveryExchangeInUrl(new URLSearchParams(), ""),
    ).toBe(false);
  });
});
