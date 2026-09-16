/**
 * Solo para desarrollo o tests sin dominio verificado en Resend.
 * En producción configurá `RESEND_FROM` (p. ej. hola@pagolisto.com.ar).
 */
export const RESEND_FALLBACK_FROM = "onboarding@resend.dev";

function allowsResendFromFallback(): boolean {
  const env = process.env.NODE_ENV;
  return env === "development" || env === "test";
}

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your environment (e.g. .env.local)."
    );
  }
  return key;
}

/** Devuelve remitente o null si falta config en producción (no lanza). */
export function resolveResendFromAddress(): string | null {
  const from = process.env.RESEND_FROM?.trim();
  if (from) return from;
  if (allowsResendFromFallback()) {
    return RESEND_FALLBACK_FROM;
  }
  return null;
}

export function getResendFromAddress(): string {
  const from = resolveResendFromAddress();
  if (from) return from;
  throw new Error(
    "RESEND_FROM is not set. Add it to your environment for production (e.g. hola@pagolisto.com.ar)."
  );
}
