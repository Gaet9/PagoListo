import { describe, it, expect } from "vitest";

import {
  FORGOT_PASSWORD_SENT_SEARCH_PARAM,
  forgotPasswordSentFromSearchParam,
} from "@/lib/auth/forgot-password-sent-state";

describe("forgotPasswordSentFromSearchParam", () => {
  it("detecta sent=1 en query", () => {
    expect(
      forgotPasswordSentFromSearchParam(
        undefined,
      ),
    ).toBe(false);
    expect(forgotPasswordSentFromSearchParam("1")).toBe(true);
    expect(forgotPasswordSentFromSearchParam("0")).toBe(false);
    expect(forgotPasswordSentFromSearchParam(["1", "x"])).toBe(true);
  });

  it("expone el nombre del parámetro de búsqueda", () => {
    expect(FORGOT_PASSWORD_SENT_SEARCH_PARAM).toBe("sent");
  });
});
