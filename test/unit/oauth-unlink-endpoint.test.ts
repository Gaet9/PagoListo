import { describe, expect, it } from "vitest";

import { MERCADOPAGO_OAUTH_UNLINK_API_PATH } from "@/lib/mercadopago/oauth-unlink-endpoint";

describe("MERCADOPAGO_OAUTH_UNLINK_API_PATH", () => {
  it("apunta al path esperado bajo /api/mercadopago/oauth/", () => {
    expect(MERCADOPAGO_OAUTH_UNLINK_API_PATH).toBe("/api/mercadopago/oauth/unlink");
  });
});
