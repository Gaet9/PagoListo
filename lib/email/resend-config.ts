/**
 * Solo para desarrollo sin dominio verificado en Resend.
 * En producción configurá `RESEND_FROM` (p. ej. hola@pagolisto.com.ar).
 */
export const RESEND_FALLBACK_FROM = "onboarding@resend.dev";

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your environment (e.g. .env.local)."
    );
  }
  return key;
}

export function getResendFromAddress(): string {
  const from = process.env.RESEND_FROM?.trim();
  if (from) return from;
  return RESEND_FALLBACK_FROM;
}
