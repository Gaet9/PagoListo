import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildMercadoPagoAuthorizeUrl } from "@/lib/mercadopago/oauth";
import {
  buildMercadoPagoOAuthStartReconnectDebug,
  MERCADOPAGO_OAUTH_START_DEBUG_HEADER_AUTHORIZE_PROMPT,
  MERCADOPAGO_OAUTH_START_DEBUG_HEADER_RECONNECT,
  mercadoPagoOAuthStartReconnectDebugHeaders,
} from "@/lib/mercadopago/oauth-start-debug";

describe("mercadoPagoOAuthStartReconnectDebug", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("headers y debug confirman reconnect + prompt=login", () => {
    vi.stubEnv("MERCADOPAGO_OAUTH_CLIENT_ID", "1234567890123456");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.pagolisto.com.ar");
    vi.stubEnv("MERCADOPAGO_OAUTH_REDIRECT_URI", "");
    const authUrl = buildMercadoPagoAuthorizeUrl({
      state: "st",
      codeChallenge: "ch",
      reconnect: true,
    });

    const debug = buildMercadoPagoOAuthStartReconnectDebug(authUrl);
    expect(debug.reconnect).toBe(true);
    expect(debug.authorizePrompt).toBe("login");
    expect(debug.authorizeHasPromptLogin).toBe(true);

    const headers = mercadoPagoOAuthStartReconnectDebugHeaders();
    expect(headers[MERCADOPAGO_OAUTH_START_DEBUG_HEADER_RECONNECT]).toBe("1");
    expect(headers[MERCADOPAGO_OAUTH_START_DEBUG_HEADER_AUTHORIZE_PROMPT]).toBe("login");
  });
});
