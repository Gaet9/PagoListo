const DEFAULT_NEXT = "/perfil";

/**
 * Valida `next` post-login (query u otra fuente). Solo rutas internas relativas;
 * evita open-redirect y bucles hacia /auth.
 */
export function getSafeInternalNextPath(raw: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  const v = raw?.trim();
  if (!v) return fallback;
  if (!v.startsWith("/") || v.startsWith("//")) return fallback;
  if (v.startsWith("/auth")) return fallback;
  if (v.startsWith("/api") || v.startsWith("/_next")) return fallback;
  return v;
}
