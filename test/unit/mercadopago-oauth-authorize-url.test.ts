import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildMercadoPagoAuthorizeUrl } from "@/lib/mercadopago/oauth";

describe("buildMercadoPagoAuthorizeUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("arma la URL de authorize con PKCE, scopes y redirect canónico", () => {
    vi.stubEnv("MERCADOPAGO_OAUTH_CLIENT_ID", "1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.pagolisto.com.ar");
    vi.stubEnv("MERCADOPAGO_OAUTH_REDIRECT_URI", "");

    const url = new URL(buildMercadoPagoAuthorizeUrl({ state: "abc123", codeChallenge: "challenge-value" }));

    expect(url.origin).toBe("https://auth.mercadopago.com");
    expect(url.pathname).toBe("/authorization");
    expect(url.searchParams.get("client_id")).toBe("1234567890123456");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("platform_id")).toBe("mp");
    expect(url.searchParams.get("state")).toBe("abc123");
    expect(url.searchParams.get("scope")).toBe("offline_access payments write");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://www.pagolisto.com.ar/api/mercadopago/oauth/callback",
    );
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.has("prompt")).toBe(false);
  });

  it("con reconnect agrega prompt=login", () => {
    vi.stubEnv("MERCADOPAGO_OAUTH_CLIENT_ID", "1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.pagolisto.com.ar");
    vi.stubEnv("MERCADOPAGO_OAUTH_REDIRECT_URI", "");

    const url = new URL(
      buildMercadoPagoAuthorizeUrl({
        state: "abc123",
        codeChallenge: "challenge-value",
        reconnect: true,
      }),
    );

    expect(url.searchParams.get("prompt")).toBe("login");
  });
});
