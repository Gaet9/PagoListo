import { afterEach, describe, expect, it, vi } from "vitest";

describe("getMercadoPagoOAuthPostConsentOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("en development devuelve localhost por defecto aunque el request sea ngrok", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tunnel.example.ngrok-free.dev");
    delete process.env.MERCADOPAGO_OAUTH_BROWSER_RETURN_ORIGIN;

    const { getMercadoPagoOAuthPostConsentOrigin } = await import("@/lib/mercadopago/oauth-post-consent-origin");
    const origin = getMercadoPagoOAuthPostConsentOrigin(new URL("https://tunnel.example.ngrok-free.dev/foo"));
    expect(origin).toBe("http://localhost:3000");
  });

  it("en development respeta MERCADOPAGO_OAUTH_BROWSER_RETURN_ORIGIN", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MERCADOPAGO_OAUTH_BROWSER_RETURN_ORIGIN", "https://custom-dev.example");

    const { getMercadoPagoOAuthPostConsentOrigin } = await import("@/lib/mercadopago/oauth-post-consent-origin");
    const origin = getMercadoPagoOAuthPostConsentOrigin(new URL("http://localhost:3000/x"));
    expect(origin).toBe("https://custom-dev.example");
  });
});
