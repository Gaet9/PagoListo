import { cookies } from "next/headers";

/** Cookie que fija el negocio activo (selector en tienda / URL slug). */
export const ACTIVE_NEGOCIO_COOKIE_NAME = "pagolisto_active_negocio_id";

export const ACTIVE_NEGOCIO_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

export function readActiveNegocioIdFromCookieValue(
  cookieValue: string | undefined,
): string | null {
  const trimmed = cookieValue?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Negocio activo para gates de UI: cookie si sigue siendo válida, si no el primero de la lista RLS.
 */
export function resolveActiveNegocioId(
  cookieNegocioId: string | null | undefined,
  negocioIds: readonly string[],
): string | null {
  if (negocioIds.length === 0) {
    return null;
  }
  const trimmed = cookieNegocioId?.trim();
  if (trimmed && negocioIds.includes(trimmed)) {
    return trimmed;
  }
  return negocioIds[0] ?? null;
}

/** Persiste el negocio activo en el navegador (selector de tienda). */
export function persistActiveNegocioIdClient(negocioId: string): void {
  if (typeof document === "undefined" || !negocioId.trim()) {
    return;
  }
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ACTIVE_NEGOCIO_COOKIE_NAME}=${encodeURIComponent(negocioId.trim())}; Path=/; Max-Age=${ACTIVE_NEGOCIO_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export async function readActiveNegocioIdFromRequestCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return readActiveNegocioIdFromCookieValue(cookieStore.get(ACTIVE_NEGOCIO_COOKIE_NAME)?.value);
}
