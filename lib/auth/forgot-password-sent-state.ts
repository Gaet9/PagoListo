const FORGOT_PASSWORD_SENT_STORAGE_KEY = "pagolisto:forgot-password-sent";

export const FORGOT_PASSWORD_SENT_SEARCH_PARAM = "sent";

export function markForgotPasswordEmailRequested(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FORGOT_PASSWORD_SENT_STORAGE_KEY, "1");
}

export function readForgotPasswordEmailRequestedFromSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(FORGOT_PASSWORD_SENT_STORAGE_KEY) === "1";
}

export function forgotPasswordSentFromSearchParam(
  value: string | string[] | undefined,
): boolean {
  if (value === "1") return true;
  if (Array.isArray(value)) return value.includes("1");
  return false;
}
