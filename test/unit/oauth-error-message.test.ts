import { describe, expect, it } from "vitest";

import {
  getOAuthCallbackErrorMessage,
  OAUTH_STATE_EXPIRED_MESSAGE,
} from "@/lib/auth/oauth-error-message";

describe("getOAuthCallbackErrorMessage", () => {
  it("traduce state expirado de Supabase", () => {
    expect(
      getOAuthCallbackErrorMessage(
        "OAuth state not found or expired",
      ),
    ).toBe(OAUTH_STATE_EXPIRED_MESSAGE);
  });

  it("devuelve mensaje genérico si falta detalle", () => {
    expect(getOAuthCallbackErrorMessage(null)).toMatch(/Google/);
  });

  it("conserva otros errores", () => {
    expect(getOAuthCallbackErrorMessage("access_denied")).toBe("access_denied");
  });
});
