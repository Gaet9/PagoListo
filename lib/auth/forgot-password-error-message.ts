/** Mensaje genérico cuando falla el envío SMTP / proveedor (sin revelar si el correo existe). */
export const FORGOT_PASSWORD_EMAIL_SEND_ERROR_MESSAGE =
  "No pudimos enviar el correo de recuperación en este momento. Probá de nuevo más tarde o contactanos si el problema continúa.";

const EMAIL_SEND_FAILURE_PATTERN =
  /recovery email|sending recovery|unexpected_failure/i;

export function getForgotPasswordErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (EMAIL_SEND_FAILURE_PATTERN.test(error.message)) {
      return FORGOT_PASSWORD_EMAIL_SEND_ERROR_MESSAGE;
    }
    return error.message;
  }
  return "Ocurrió un error";
}
