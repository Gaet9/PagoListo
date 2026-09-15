import { mercadoPagoAmountsMatch } from "@/lib/mercadopago/cobro-amount";
import { computeNextSubscriptionPeriodEnd } from "@/lib/auth/user-subscription";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SaasAbonoIntentoRow = {
  id: string;
  usuario_id: string;
  plan_code: string;
  expected_total_ars: number | string;
  mp_preference_id: string;
  consumed_at: string | null;
  mp_payment_id: string | null;
};

export type MercadoPagoPaymentForAbono = {
  status?: string;
  preference_id?: string | null;
  external_reference?: string | null;
  transaction_amount?: number;
  metadata?: { intento_id?: string; kind?: string };
};

export function resolveSaasAbonoIntentoLookupId(payment: MercadoPagoPaymentForAbono): string | null {
  const metadataIntentoId =
    typeof payment.metadata?.intento_id === "string" ? payment.metadata.intento_id.trim() : null;
  const externalRef = typeof payment.external_reference === "string" ? payment.external_reference.trim() : null;
  return metadataIntentoId || externalRef || null;
}

export function expectedTotalFromIntento(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const parsed = parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Procesa un pago aprobado del abono SaaS (Checkout Pro con token global).
 * Idempotente vía claim de intento + índice único en mp_payment_id.
 */
export async function processSaasAbonoApprovedPayment(
  admin: SupabaseClient,
  paymentId: string,
  payment: MercadoPagoPaymentForAbono,
): Promise<{ handled: boolean; reason?: string }> {
  const status = typeof payment.status === "string" ? payment.status : null;
  if (status !== "approved") {
    return { handled: false, reason: "not_approved" };
  }

  const intentoLookupId = resolveSaasAbonoIntentoLookupId(payment);
  if (!intentoLookupId) {
    return { handled: false, reason: "missing_reference" };
  }

  const { data: intento, error: intentoErr } = await admin
    .from("mp_saas_abono_intentos")
    .select("id, usuario_id, plan_code, expected_total_ars, mp_preference_id, consumed_at, mp_payment_id")
    .eq("id", intentoLookupId)
    .maybeSingle<SaasAbonoIntentoRow>();

  if (intentoErr || !intento) {
    return { handled: false, reason: "intento_not_found" };
  }

  if (intento.consumed_at || intento.mp_payment_id) {
    return { handled: true, reason: "already_consumed" };
  }

  const preferenceId = typeof payment.preference_id === "string" ? payment.preference_id : null;
  if (preferenceId && intento.mp_preference_id !== preferenceId) {
    return { handled: true, reason: "preference_mismatch" };
  }

  const expectedTotal = expectedTotalFromIntento(intento.expected_total_ars);
  const paidAmount = typeof payment.transaction_amount === "number" ? payment.transaction_amount : null;
  if (expectedTotal !== null && expectedTotal > 0) {
    if (paidAmount === null || !mercadoPagoAmountsMatch(expectedTotal, paidAmount)) {
      return { handled: true, reason: "amount_mismatch" };
    }
  }

  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from("mp_saas_abono_intentos")
    .update({ consumed_at: nowIso, mp_payment_id: paymentId })
    .eq("id", intento.id)
    .is("consumed_at", null)
    .is("mp_payment_id", null)
    .select("id")
    .maybeSingle();

  if (claimErr) {
    console.error("[mercadopago:webhook:saas_abono] claim_failed", claimErr.message);
    return { handled: true, reason: "claim_failed" };
  }
  if (!claimed?.id) {
    return { handled: true, reason: "claim_race" };
  }

  const { data: existingSub } = await admin
    .from("suscripciones_usuario")
    .select("current_period_end")
    .eq("user_id", intento.usuario_id)
    .maybeSingle<{ current_period_end: string | null }>();

  const now = new Date();
  const existingEnd =
    existingSub?.current_period_end ? new Date(existingSub.current_period_end) : null;
  const nextEnd = computeNextSubscriptionPeriodEnd(
    existingEnd && !Number.isNaN(existingEnd.getTime()) ? existingEnd : null,
    now,
  );

  const { error: upsertErr } = await admin.from("suscripciones_usuario").upsert(
    {
      user_id: intento.usuario_id,
      status: "active",
      plan_code: intento.plan_code,
      current_period_end: nextEnd.toISOString(),
      updated_at: nowIso,
    },
    { onConflict: "user_id" },
  );

  if (upsertErr) {
    console.error("[mercadopago:webhook:saas_abono] subscription_upsert_failed", upsertErr.message);
    await admin
      .from("mp_saas_abono_intentos")
      .update({ consumed_at: null, mp_payment_id: null })
      .eq("id", intento.id);
    return { handled: true, reason: "subscription_upsert_failed" };
  }

  return { handled: true, reason: "activated" };
}
