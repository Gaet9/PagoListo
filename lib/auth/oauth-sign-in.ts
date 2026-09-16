import { getSafeInternalNextPath } from "@/lib/auth/safe-next-path";

/** `redirectTo` para `signInWithOAuth` (intercambio PKCE en `/auth/callback`). */
export function buildOAuthSignInRedirectTo(
  origin: string,
  rawNext?: string | null,
): string {
  const base = origin.replace(/\/$/, "");
  const next = encodeURIComponent(getSafeInternalNextPath(rawNext));
  return `${base}/auth/callback?next=${next}`;
}
