import type { SupabaseClient } from "@supabase/supabase-js";

import { getOAuthCallbackErrorMessage } from "@/lib/auth/oauth-error-message";
import { buildOAuthSignInRedirectTo } from "@/lib/auth/oauth-sign-in";

export type StartGoogleOAuthResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Inicia OAuth con Google: un solo redirect manual (`skipBrowserRedirect`) para evitar
 * carreras que invalidan el state PKCE.
 */
export async function startGoogleOAuthSignIn(
  supabase: SupabaseClient,
  options: { nextPath?: string | null; origin?: string },
): Promise<StartGoogleOAuthResult> {
  const origin =
    options.origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  if (!origin) {
    return {
      ok: false,
      message: "No se pudo iniciar el inicio de sesión con Google.",
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildOAuthSignInRedirectTo(origin, options.nextPath),
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return { ok: false, message: getOAuthCallbackErrorMessage(error.message) };
  }

  if (!data?.url) {
    return {
      ok: false,
      message:
        "No se recibió la URL de Google. Probá de nuevo en unos segundos.",
    };
  }

  window.location.assign(data.url);
  return { ok: true };
}
