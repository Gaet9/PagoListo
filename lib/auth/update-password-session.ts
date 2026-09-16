import type { SupabaseClient, Session } from "@supabase/supabase-js";

import {
  getRecoverySessionExchangePath,
  hasImplicitRecoveryHash,
  RECOVERY_SESSION_EXPIRED_MESSAGE,
  RECOVERY_SESSION_MISSING_MESSAGE,
} from "@/lib/auth/password-recovery";

export type UpdatePasswordSessionStatus = "loading" | "ready" | "error";

export type UpdatePasswordSessionResult = {
  status: UpdatePasswordSessionStatus;
  message: string | null;
};

export const RECOVERY_SESSION_VERIFY_TIMEOUT_MS = 12_000;
const HASH_POLL_INTERVAL_MS = 100;
const HASH_POLL_MAX_ATTEMPTS = 40;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Quita parámetros de recuperación de la URL sin recargar (evita re-intercambios). */
export function stripRecoveryParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  const nextHash = url.hash && hasImplicitRecoveryHash(url.hash) ? "" : url.hash;
  const next =
    `${url.pathname}${url.search}${nextHash}` || url.pathname;
  window.history.replaceState(window.history.state, "", next);
}

export function sessionHasUser(session: Session | null): boolean {
  return Boolean(session?.user);
}

export async function readAuthUser(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { session },
  } = await withTimeout(
    supabase.auth.getSession(),
    8_000,
    "getSession",
  );
  if (sessionHasUser(session)) return true;

  const {
    data: { user },
    error,
  } = await withTimeout(supabase.auth.getUser(), 8_000, "getUser");
  return !error && Boolean(user);
}

/**
 * Intenta intercambiar `code` en el navegador (PKCE verifier local).
 * Devuelve true si hay sesión tras el intercambio.
 */
export async function tryClientRecoveryCodeExchange(
  supabase: SupabaseClient,
  searchParams: URLSearchParams,
): Promise<boolean> {
  const code = searchParams.get("code");
  if (!code) return false;

  const { error } = await withTimeout(
    supabase.auth.exchangeCodeForSession(code),
    8_000,
    "exchangeCodeForSession",
  );
  if (error) return false;

  stripRecoveryParamsFromUrl();
  return readAuthUser(supabase);
}

export type RecoverySessionResolution =
  | { kind: "ready" }
  | { kind: "error"; message: string }
  | { kind: "redirect"; path: string };

/**
 * Resuelve sesión de recuperación para la pantalla de nueva contraseña.
 * No registra listeners; el componente debe reaccionar a `onAuthStateChange` aparte.
 */
export async function resolveUpdatePasswordSession(
  supabase: SupabaseClient,
  location: Pick<Location, "search" | "hash">,
): Promise<RecoverySessionResolution> {
  const searchParams = new URLSearchParams(location.search);

  const exchangePath = getRecoverySessionExchangePath(searchParams);
  const code = searchParams.get("code");

  if (code) {
    const exchanged = await tryClientRecoveryCodeExchange(supabase, searchParams);
    if (exchanged) return { kind: "ready" };
    if (exchangePath) return { kind: "redirect", path: exchangePath };
  } else if (exchangePath) {
    return { kind: "redirect", path: exchangePath };
  }

  if (await readAuthUser(supabase)) {
    stripRecoveryParamsFromUrl();
    return { kind: "ready" };
  }

  const waitingForHash = hasImplicitRecoveryHash(location.hash);
  if (waitingForHash) {
    for (let attempt = 0; attempt < HASH_POLL_MAX_ATTEMPTS; attempt += 1) {
      if (await readAuthUser(supabase)) {
        stripRecoveryParamsFromUrl();
        return { kind: "ready" };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, HASH_POLL_INTERVAL_MS),
      );
    }
    return { kind: "error", message: RECOVERY_SESSION_EXPIRED_MESSAGE };
  }

  return { kind: "error", message: RECOVERY_SESSION_MISSING_MESSAGE };
}

export function mapRecoverySessionResolution(
  resolution: RecoverySessionResolution,
): UpdatePasswordSessionResult {
  switch (resolution.kind) {
    case "ready":
      return { status: "ready", message: null };
    case "error":
      return { status: "error", message: resolution.message };
    case "redirect":
      return { status: "loading", message: null };
  }
}
