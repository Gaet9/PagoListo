import type { SupabaseClient } from "@supabase/supabase-js";

import { isActiveSubscription, type UserSubscriptionRow } from "@/lib/auth/user-subscription";

export type CancelSubscriptionResult =
  | { ok: true; row: UserSubscriptionRow }
  | { ok: false; reason: "not_found" | "no_access" | "already_canceled" | "update_failed" };

/**
 * Marca la suscripción como cancelada; el acceso sigue hasta `current_period_end`.
 * Escritura vía service_role (RLS no permite UPDATE al usuario).
 */
export async function cancelUserSubscription(
  admin: SupabaseClient,
  userId: string,
): Promise<CancelSubscriptionResult> {
  const { data: row, error: fetchErr } = await admin
    .from("suscripciones_usuario")
    .select("status, current_period_end, plan_code, canceled_at")
    .eq("user_id", userId)
    .maybeSingle<UserSubscriptionRow>();

  if (fetchErr || !row) {
    return { ok: false, reason: "not_found" };
  }

  if (row.status === "canceled" && isActiveSubscription(row)) {
    return { ok: true, row };
  }

  if (row.status === "canceled") {
    return { ok: false, reason: "already_canceled" };
  }

  if (!isActiveSubscription(row) || row.status !== "active") {
    return { ok: false, reason: "no_access" };
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("suscripciones_usuario")
    .update({
      status: "canceled",
      canceled_at: nowIso,
      updated_at: nowIso,
    })
    .eq("user_id", userId)
    .eq("status", "active")
    .select("status, current_period_end, plan_code, canceled_at")
    .maybeSingle<UserSubscriptionRow>();

  if (updateErr || !updated) {
    return { ok: false, reason: "update_failed" };
  }

  return { ok: true, row: updated };
}
