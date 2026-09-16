import type { SupabaseClient } from "@supabase/supabase-js";

export type UserSubscriptionRow = {
  status: string;
  current_period_end: string | null;
  plan_code: string | null;
  canceled_at?: string | null;
};

/** Estados que mantienen acceso hasta `current_period_end`. */
export const SUBSCRIPTION_ACCESS_STATUSES = new Set(["active", "canceled"]);

export type SubscriptionUiPhase = "none" | "active" | "canceled_until_end" | "expired";

export function resolveSubscriptionUiPhase(
  row: UserSubscriptionRow | null | undefined,
  now = new Date(),
): SubscriptionUiPhase {
  if (!row) return "none";
  if (isActiveSubscription(row, now)) {
    return row.status === "canceled" ? "canceled_until_end" : "active";
  }
  if (!row.current_period_end && (row.status === "inactive" || row.status === "past_due")) {
    return "none";
  }
  return "expired";
}

/** Si es false, el paywall no bloquea (útil en dev local). En producción debe ser true. */
export function isSubscriptionEnforcementEnabled(): boolean {
  const raw = process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") {
    return false;
  }
  return true;
}

export function isActiveSubscription(row: UserSubscriptionRow | null | undefined, now = new Date()): boolean {
  if (!row) return false;
  if (!SUBSCRIPTION_ACCESS_STATUSES.has(row.status)) return false;
  if (!row.current_period_end) return false;
  const end = new Date(row.current_period_end);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > now.getTime();
}

/** Extiende un mes desde la fecha de fin vigente o desde `from` si ya venció. */
export function computeNextSubscriptionPeriodEnd(existingPeriodEnd: Date | null, from: Date): Date {
  const base =
    existingPeriodEnd && existingPeriodEnd.getTime() > from.getTime() ? existingPeriodEnd : from;
  const next = new Date(base);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export async function fetchUserSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSubscriptionRow | null> {
  const { data, error } = await supabase
    .from("suscripciones_usuario")
    .select("status, current_period_end, plan_code, canceled_at")
    .eq("user_id", userId)
    .maybeSingle<UserSubscriptionRow>();

  if (error) {
    throw new Error(error.message);
  }
  return data ?? null;
}

export async function userHasActiveSubscription(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (!isSubscriptionEnforcementEnabled()) {
    return true;
  }
  const row = await fetchUserSubscription(supabase, userId);
  return isActiveSubscription(row);
}
