import { getSafeInternalNextPath } from "@/lib/auth/safe-next-path";

export const PASSWORD_RECOVERY_UPDATE_PATH = "/auth/update-password";

/** `redirectTo` para `resetPasswordForEmail` (ruta allow-listed; el intercambio PKCE ocurre en el cliente). */
export function buildPasswordRecoveryRedirectTo(origin: string): string {
  return `${origin.replace(/\/$/, "")}${PASSWORD_RECOVERY_UPDATE_PATH}`;
}

/**
 * Si la URL de recuperación trae `code` o `token_hash`, devuelve la ruta interna
 * donde debe intercambiarse la sesión (callback o confirm).
 */
export function getRecoverySessionExchangePath(
  searchParams: URLSearchParams,
): string | null {
  const code = searchParams.get("code");
  if (code) {
    const next = encodeURIComponent(
      getSafeInternalNextPath(
        PASSWORD_RECOVERY_UPDATE_PATH,
        PASSWORD_RECOVERY_UPDATE_PATH,
      ),
    );
    return `/auth/callback?code=${encodeURIComponent(code)}&next=${next}`;
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && type) {
    const next = encodeURIComponent(PASSWORD_RECOVERY_UPDATE_PATH);
    return `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&next=${next}`;
  }

  return null;
}

export function hasImplicitRecoveryHash(hash: string): boolean {
  if (!hash || hash.length <= 1) return false;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return (
    params.get("type") === "recovery" ||
    (params.has("access_token") && params.get("type") === "recovery")
  );
}

/** `token_hash` + `type` en query (enlace de recuperación sin pasar por `/auth/confirm`). */
export function getRecoveryTokenHashFromSearchParams(
  searchParams: URLSearchParams,
): { tokenHash: string; type: string } | null {
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (!tokenHash || !type) return null;
  return { tokenHash, type };
}

/**
 * Tras PR #13 (`redirectTo` = `/auth/update-password` sin query), el correo suele abrir
 * esta ruta con `?code=`, `?token_hash=` o tokens en el hash; hay que intercambiar antes del formulario.
 */
export function hasPendingRecoveryExchangeInUrl(
  searchParams: URLSearchParams,
  hash: string,
): boolean {
  return (
    Boolean(searchParams.get("code")) ||
    getRecoveryTokenHashFromSearchParams(searchParams) !== null ||
    hasImplicitRecoveryHash(hash)
  );
}

export const RECOVERY_SESSION_MISSING_MESSAGE =
  "No hay una sesión de recuperación activa. Abrí el enlace del correo o pedí uno nuevo en «Olvidé mi contraseña».";

export const RECOVERY_SESSION_EXPIRED_MESSAGE =
  "El enlace de recuperación expiró o no es válido. Pedí un correo nuevo desde «Olvidé mi contraseña».";

/** Tiempo máximo en pantalla de redirección antes de mostrar error (p. ej. webview que bloquea `location.replace`). */
export const RECOVERY_EXCHANGE_REDIRECT_TIMEOUT_MS = 10_000;

/** Tiempo máximo en «Verificando…» antes de asumir que no hay sesión de recuperación. */
export const RECOVERY_SESSION_VERIFY_TIMEOUT_MS = 15_000;

export const RECOVERY_VERIFYING_MESSAGE =
  "Verificando tu enlace de recuperación…";

export const RECOVERY_REDIRECTING_MESSAGE =
  "Redirigiendo para confirmar tu enlace…";

export const RECOVERY_REDIRECT_FAILED_MESSAGE =
  "No pudimos completar la validación del enlace. Abrilo en Safari o Chrome (no desde la vista previa del correo) o pedí un correo nuevo.";
