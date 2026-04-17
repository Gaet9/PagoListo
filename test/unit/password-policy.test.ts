import { describe, it, expect } from "vitest";

import { PASSWORD_MIN_LENGTH, validateNewPasswordStrength } from "@/lib/auth/password-policy";

describe("validateNewPasswordStrength", () => {
  it("rechaza contraseñas más cortas que el mínimo", () => {
    expect(validateNewPasswordStrength("a".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    );
  });

  it("acepta contraseñas con longitud mínima", () => {
    expect(validateNewPasswordStrength("a".repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });
});
