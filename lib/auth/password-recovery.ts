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
  if (params.get("error")) return false;
  if (params.get("type") === "recovery") return true;
  // Algunos enlaces traen tokens en el hash sin `type=recovery`.
  return params.has("access_token");
}

export const RECOVERY_SESSION_MISSING_MESSAGE =
  "No hay una sesión de recuperación activa. Abrí el enlace del correo o pedí uno nuevo en «Olvidé mi contraseña».";

export const RECOVERY_SESSION_EXPIRED_MESSAGE =
  "El enlace de recuperación expiró o no es válido. Pedí un correo nuevo desde «Olvidé mi contraseña».";
