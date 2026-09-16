import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";

import {
  getRecoverySessionExchangePath,
  hasImplicitRecoveryHash,
  PASSWORD_RECOVERY_UPDATE_PATH,
  RECOVERY_SESSION_EXPIRED_MESSAGE,
} from "@/lib/auth/password-recovery";

/** Evita bucles de `location.replace` entre update-password y callback/confirm. */
export const RECOVERY_EXCHANGE_ATTEMPT_STORAGE_KEY =
  "pagolisto:recovery-exchange-code";

export type EstablishRecoveryOutcome =
  | { kind: "ready" }
  | { kind: "redirect"; path: string }
  | { kind: "wait_for_implicit_hash" }
  | { kind: "check_existing_session" }
  | { kind: "error"; message: string };

/** Tiempo máximo mostrando «Verificando…» antes de mostrar error. */
export const RECOVERY_SESSION_VERIFY_TIMEOUT_MS = 12_000;

export function clearRecoveryExchangeAttempt(): void {
  try {
    sessionStorage.removeItem(RECOVERY_EXCHANGE_ATTEMPT_STORAGE_KEY);
  } catch {
    /* sessionStorage puede estar bloqueado */
  }
}

function markRecoveryExchangeAttempt(code: string): void {
  try {
    sessionStorage.setItem(RECOVERY_EXCHANGE_ATTEMPT_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

function wasRecoveryExchangeAttempted(code: string): boolean {
  try {
    return sessionStorage.getItem(RECOVERY_EXCHANGE_ATTEMPT_STORAGE_KEY) === code;
  } catch {
    return false;
  }
}

/** Quita parámetros de recuperación de la URL sin recargar. */
export function stripRecoveryParamsFromBrowserUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const recoveryQueryKeys = ["code", "token_hash", "type"];
  for (const key of recoveryQueryKeys) {
    url.searchParams.delete(key);
  }
  url.hash = "";
  const nextPath =
    url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : "");
  window.history.replaceState({}, "", nextPath || PASSWORD_RECOVERY_UPDATE_PATH);
}

async function trySetSessionFromImplicitHash(
  supabase: SupabaseClient,
  hash: string,
): Promise<boolean> {
  if (!hasImplicitRecoveryHash(hash)) return false;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return false;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) return false;
  stripRecoveryParamsFromBrowserUrl();
  return true;
}

/**
 * Intenta establecer la sesión de recuperación en el cliente (PKCE, OTP o hash).
 * Si el intercambio en cliente falla una vez, sugiere redirect al route handler.
 */
export async function establishRecoverySession(
  supabase: SupabaseClient,
  searchParams: URLSearchParams,
  hash: string,
): Promise<EstablishRecoveryOutcome> {
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      clearRecoveryExchangeAttempt();
      stripRecoveryParamsFromBrowserUrl();
      return { kind: "ready" };
    }

    if (wasRecoveryExchangeAttempted(code)) {
      return { kind: "error", message: RECOVERY_SESSION_EXPIRED_MESSAGE };
    }

    const exchangePath = getRecoverySessionExchangePath(searchParams);
    if (exchangePath) {
      markRecoveryExchangeAttempt(code);
      return { kind: "redirect", path: exchangePath };
    }

    return {
      kind: "error",
      message: error.message || RECOVERY_SESSION_EXPIRED_MESSAGE,
    };
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      stripRecoveryParamsFromBrowserUrl();
      return { kind: "ready" };
    }

    const exchangePath = getRecoverySessionExchangePath(searchParams);
    if (exchangePath) {
      return { kind: "redirect", path: exchangePath };
    }

    return {
      kind: "error",
      message: error.message || RECOVERY_SESSION_EXPIRED_MESSAGE,
    };
  }

  if (await trySetSessionFromImplicitHash(supabase, hash)) {
    return { kind: "ready" };
  }

  if (hasImplicitRecoveryHash(hash)) {
    return { kind: "wait_for_implicit_hash" };
  }

  return { kind: "check_existing_session" };
}
