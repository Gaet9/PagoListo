import { describe, expect, it } from "vitest";

import { buildOAuthSignInRedirectTo } from "@/lib/auth/oauth-sign-in";

describe("buildOAuthSignInRedirectTo", () => {
  it("apunta al callback con next codificado", () => {
    expect(
      buildOAuthSignInRedirectTo("https://www.pagolisto.com.ar", "/perfil"),
    ).toBe("https://www.pagolisto.com.ar/auth/callback?next=%2Fperfil");
  });

  it("sanitiza next y quita barra final del origin", () => {
    expect(
      buildOAuthSignInRedirectTo("https://app.test/", "//evil.com"),
    ).toBe("https://app.test/auth/callback?next=%2Fperfil");
  });
});
