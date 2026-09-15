import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getMercadoPagoAccessTokenForNegocio } from "@/lib/mercadopago/negocio-access-token";

export type MercadoPagoCobroPayment = {
  status?: string;
  preference_id?: string | null;
  external_reference?: string | null;
  transaction_amount?: number;
  metadata?: { intento_id?: string; negocio_id?: string };
};

export type CobroWebhookFetchHints = {
  negocioId: string | null;
  intentoId: string | null;
};

async function fetchPaymentWithToken(paymentId: string, accessToken: string): Promise<MercadoPagoCobroPayment | null> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as MercadoPagoCobroPayment | null;
}

/** Ordena negocios: intento/negocio del IPN primero, luego el resto con OAuth. */
export async function listNegocioIdsForCobroPaymentFetch(
  admin: SupabaseClient,
  hints: CobroWebhookFetchHints,
): Promise<string[]> {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (id: string | null | undefined) => {
    const trimmed = typeof id === "string" ? id.trim() : "";
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    ordered.push(trimmed);
  };

  if (hints.intentoId) {
    const { data: intento } = await admin
      .from("mp_cobro_intentos")
      .select("negocio_id")
      .eq("id", hints.intentoId)
      .maybeSingle();
    const fromIntento = typeof intento?.negocio_id === "string" ? intento.negocio_id : null;
    if (fromIntento && hints.negocioId && fromIntento !== hints.negocioId) {
      push(hints.negocioId);
    } else {
      push(fromIntento);
      push(hints.negocioId);
    }
  } else {
    push(hints.negocioId);
  }

  const { data: rows, error } = await admin.from("negocio_mercadopago_oauth").select("negocio_id").limit(200);
  if (error) return ordered;
  for (const row of rows ?? []) {
    push(row.negocio_id as string);
  }
  return ordered;
}

export async function fetchMercadoPagoCobroPayment(
  admin: SupabaseClient,
  paymentId: string,
  hints: CobroWebhookFetchHints,
): Promise<{ payment: MercadoPagoCobroPayment; negocioId: string } | null> {
  const negocioIds = await listNegocioIdsForCobroPaymentFetch(admin, hints);
  for (const negocioId of negocioIds) {
    try {
      const accessToken = await getMercadoPagoAccessTokenForNegocio(admin, negocioId);
      if (!accessToken) continue;
      const payment = await fetchPaymentWithToken(paymentId, accessToken);
      if (payment) {
        return { payment, negocioId };
      }
    } catch {
      // try next negocio
    }
  }
  return null;
}
