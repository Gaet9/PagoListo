/** Mensaje cuando el state PKCE/OAuth expiró o se invalidó (doble clic, pestaña vieja, etc.). */
export const OAUTH_STATE_EXPIRED_MESSAGE =
  "La ventana de inicio de sesión expiró o ya se usó. Volvé a «Iniciar sesión» y tocá «Continuar con Google» una sola vez, sin abrir varias pestañas.";

const OAUTH_STATE_EXPIRED_PATTERNS = [
  /oauth state not found or expired/i,
  /state not found or expired/i,
  /invalid flow state/i,
  /flow state/i,
];

export function getOAuthCallbackErrorMessage(
  raw: string | null | undefined,
): string {
  const message = raw?.trim();
  if (!message) {
    return "No se pudo completar el inicio de sesión con Google.";
  }
  if (OAUTH_STATE_EXPIRED_PATTERNS.some((pattern) => pattern.test(message))) {
    return OAUTH_STATE_EXPIRED_MESSAGE;
  }
  return message;
}
