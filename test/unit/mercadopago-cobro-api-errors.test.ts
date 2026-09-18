import { describe, expect, it } from "vitest";

import { COBRO_API_ERROR_MESSAGES } from "@/lib/mercadopago/cobro-api-errors";

describe("COBRO_API_ERROR_MESSAGES", () => {
  it("exposes Spanish messages for cobro API routes", () => {
    expect(COBRO_API_ERROR_MESSAGES.invalidJson).toMatch(/json/i);
    expect(COBRO_API_ERROR_MESSAGES.unauthorized).toMatch(/sesión/i);
    expect(COBRO_API_ERROR_MESSAGES.forbiddenIntento).toMatch(/consultar/i);
  });
});
