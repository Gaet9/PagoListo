import { describe, expect, it } from "vitest";

import { resolveActiveNegocioId } from "@/lib/negocio/active-negocio-context";

describe("resolveActiveNegocioId", () => {
  const ids = ["n-a", "n-b"];

  it("uses cookie when it matches a negocio visible al usuario", () => {
    expect(resolveActiveNegocioId("n-b", ids)).toBe("n-b");
  });

  it("falls back to first negocio when cookie is missing or invalid", () => {
    expect(resolveActiveNegocioId(null, ids)).toBe("n-a");
    expect(resolveActiveNegocioId("otro", ids)).toBe("n-a");
  });

  it("returns null when the user has no negocios", () => {
    expect(resolveActiveNegocioId("n-a", [])).toBeNull();
  });
});
