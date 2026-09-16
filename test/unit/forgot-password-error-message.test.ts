import { describe, expect, it } from "vitest";

import {
  FORGOT_PASSWORD_EMAIL_SEND_ERROR_MESSAGE,
  getForgotPasswordErrorMessage,
} from "@/lib/auth/forgot-password-error-message";

describe("getForgotPasswordErrorMessage", () => {
  it("traduce fallos de envío del correo de recuperación", () => {
    expect(
      getForgotPasswordErrorMessage(
        new Error("Error sending recovery email"),
      ),
    ).toBe(FORGOT_PASSWORD_EMAIL_SEND_ERROR_MESSAGE);
    expect(
      getForgotPasswordErrorMessage(new Error("unexpected_failure")),
    ).toBe(FORGOT_PASSWORD_EMAIL_SEND_ERROR_MESSAGE);
  });

  it("conserva otros mensajes de Error", () => {
    expect(
      getForgotPasswordErrorMessage(new Error("Invalid email")),
    ).toBe("Invalid email");
    expect(
      getForgotPasswordErrorMessage(new Error("Email rate limit exceeded")),
    ).toBe("Email rate limit exceeded");
  });

  it("devuelve mensaje genérico para valores no Error", () => {
    expect(getForgotPasswordErrorMessage("fail")).toBe("Ocurrió un error");
    expect(getForgotPasswordErrorMessage(null)).toBe("Ocurrió un error");
  });
});
