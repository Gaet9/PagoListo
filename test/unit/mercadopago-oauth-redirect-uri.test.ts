import { afterEach, describe, expect, it, vi } from "vitest";

import { getMercadoPagoOAuthRedirectUri } from "@/lib/mercadopago/oauth-redirect-uri";

describe("getMercadoPagoOAuthRedirectUri", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("deriva callback desde NEXT_PUBLIC_SITE_URL sin barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.pagolisto.com.ar/");
    vi.stubEnv("MERCADOPAGO_OAUTH_REDIRECT_URI", "");

    expect(getMercadoPagoOAuthRedirectUri()).toBe(
      "https://www.pagolisto.com.ar/api/mercadopago/oauth/callback",
    );
  });

  it("respeta MERCADOPAGO_OAUTH_REDIRECT_URI explícito", () => {
    vi.stubEnv(
      "MERCADOPAGO_OAUTH_REDIRECT_URI",
      "https://www.pagolisto.com.ar/api/mercadopago/oauth/callback/",
    );

    expect(getMercadoPagoOAuthRedirectUri()).toBe(
      "https://www.pagolisto.com.ar/api/mercadopago/oauth/callback",
    );
  });
});
