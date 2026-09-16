const DEFAULT_NEXT = "/perfil";

/** Única ruta bajo `/auth` permitida como destino post-intercambio de sesión. */
export const SAFE_AUTH_NEXT_PATHS = ["/auth/update-password"] as const;

function isSafeAuthNextPath(pathname: string): boolean {
  return SAFE_AUTH_NEXT_PATHS.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}?`),
  );
}

/**
 * Valida `next` post-login (query u otra fuente). Solo rutas internas relativas;
 * evita open-redirect y bucles hacia /auth.
 */
export function getSafeInternalNextPath(raw: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  const v = raw?.trim();
  if (!v) return fallback;
  if (!v.startsWith("/") || v.startsWith("//")) return fallback;
  const pathname = v.split("?")[0] ?? v;
  if (v.startsWith("/auth")) {
    return isSafeAuthNextPath(pathname) ? v : fallback;
  }
  if (v.startsWith("/api") || v.startsWith("/_next")) return fallback;
  return v;
}
