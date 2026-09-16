import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { resolvePostAuthRedirectUrl } from "@/lib/auth/post-auth-redirect";

describe("resolvePostAuthRedirectUrl", () => {
  it("usa x-forwarded-host en producción detrás de proxy", () => {
    const request = new NextRequest("http://internal/auth/callback?code=x", {
      headers: {
        "x-forwarded-host": "www.pagolisto.com.ar",
        "x-forwarded-proto": "https",
      },
    });
    const url = resolvePostAuthRedirectUrl(request, "/perfil");
    expect(url.href).toBe("https://www.pagolisto.com.ar/perfil");
  });

  it("usa origin del request sin forwarded headers", () => {
    const request = new NextRequest("https://www.pagolisto.com.ar/auth/callback");
    const url = resolvePostAuthRedirectUrl(request, "/perfil");
    expect(url.href).toBe("https://www.pagolisto.com.ar/perfil");
  });
});
