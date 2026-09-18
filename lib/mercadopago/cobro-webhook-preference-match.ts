/**
 * Valida que el payment.preference_id coincida con el intento persistido.
 * Si el intento aún no tiene preference_id (ventana entre insert y update), no rechazar.
 */
export function cobroWebhookPaymentPreferenceMatchesIntento(
  intentoMpPreferenceId: string | null | undefined,
  paymentPreferenceId: string | null,
): boolean {
  const stored = typeof intentoMpPreferenceId === "string" ? intentoMpPreferenceId.trim() : "";
  if (!stored) return true;
  if (!paymentPreferenceId) return true;
  return stored === paymentPreferenceId;
}
