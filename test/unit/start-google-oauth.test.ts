import { describe, expect, it, vi } from "vitest";

import { startGoogleOAuthSignIn } from "@/lib/auth/start-google-oauth";

describe("startGoogleOAuthSignIn", () => {
  it("usa skipBrowserRedirect y assign con la URL devuelta", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { assign, origin: "https://www.pagolisto.com.ar" },
    });

    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth?x=1" },
      error: null,
    });

    const supabase = { auth: { signInWithOAuth } };

    const result = await startGoogleOAuthSignIn(supabase as never, {
      nextPath: "/perfil",
    });

    expect(result).toEqual({ ok: true });
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://www.pagolisto.com.ar/auth/callback?next=%2Fperfil",
        skipBrowserRedirect: true,
      },
    });
    expect(assign).toHaveBeenCalledWith(
      "https://accounts.google.com/o/oauth2/auth?x=1",
    );

    vi.unstubAllGlobals();
  });
});
