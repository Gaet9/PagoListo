import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getMercadoPagoOAuthStartConfigWarnings,
  isMercadoPagoSandboxCredentialPrefix,
  looksLikeMercadoPagoCredentialToken,
} from "@/lib/mercadopago/oauth-credential-hints";

describe("mercadopago oauth credential hints", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("detecta tokens MP mal usados como client_id", () => {
    expect(looksLikeMercadoPagoCredentialToken("TEST-123-abc")).toBe(true);
    expect(looksLikeMercadoPagoCredentialToken("APP_USR-123-abc")).toBe(true);
    expect(looksLikeMercadoPagoCredentialToken("1234567890123456")).toBe(false);
  });

  it("en producción advierte TEST en SaaS y token en OAUTH_CLIENT_ID", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MERCADOPAGO_OAUTH_CLIENT_ID", "APP_USR-999-fake");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN_SAAS", "TEST-000-saas");
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS", "TEST-public");

    const warnings = getMercadoPagoOAuthStartConfigWarnings();
    expect(warnings.some((w) => w.includes("MERCADOPAGO_OAUTH_CLIENT_ID"))).toBe(true);
    expect(warnings.some((w) => w.includes("ACCESS_TOKEN_SAAS"))).toBe(true);
    expect(warnings.some((w) => w.includes("PUBLIC_KEY_SAAS"))).toBe(true);
  });

  it("isMercadoPagoSandboxCredentialPrefix", () => {
    expect(isMercadoPagoSandboxCredentialPrefix("TEST-abc")).toBe(true);
    expect(isMercadoPagoSandboxCredentialPrefix("APP_USR-abc")).toBe(false);
  });
});
