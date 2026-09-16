import { NextResponse, type NextRequest } from "next/server";

import { mercadoPagoAmountsMatch } from "@/lib/mercadopago/cobro-amount";
import { resolveCobroIntentoExpectedTotalArs } from "@/lib/mercadopago/cobro-intento-expected-total";
import { parseMercadoPagoCobroWebhookHints } from "@/lib/mercadopago/cobro-webhook-url";
import {
  isMercadoPagoPaymentNotification,
  parseMercadoPagoWebhookNotification,
  type MercadoPagoWebhookPayload,
} from "@/lib/mercadopago/webhook-notification-parse";
import { fetchMercadoPagoCobroPayment } from "@/lib/mercadopago/webhook-cobro-payment";
import { getMercadoPagoSaasAccessToken } from "@/lib/mercadopago/server";
import {
  shouldRejectMercadoPagoWebhookForSignature,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago/webhook-signature";
import { processSaasAbonoApprovedPayment } from "@/lib/mercadopago/webhook-saas-abono";
import { createAdminClient } from "@/lib/supabase/admin";

type MercadoPagoPayment = {
  status?: string;
  preference_id?: string | null;
  external_reference?: string | null;
  transaction_amount?: number;
  metadata?: { intento_id?: string; negocio_id?: string; kind?: string };
};

async function readWebhookPayload(request: NextRequest): Promise<unknown> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return request.json().catch(() => null);
  }
  const text = await request.text().catch(() => "");
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as MercadoPagoWebhookPayload;
  } catch {
    return { raw: text };
  }
}

function isSaasAbonoPayment(payment: MercadoPagoPayment): boolean {
  const kind = typeof payment.metadata?.kind === "string" ? payment.metadata.kind.trim() : "";
  return kind === "saas_abono";
}

/**
 * Webhook receptor para Mercado Pago (POST Webhooks v2 + legacy IPN GET/POST).
 *
 * Valida el pago consultando la API de MP (status) y activa abono SaaS o crea venta de tienda.
 */
export async function handleMercadoPagoWebhookRequest(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null;
  if (!secret) {
    console.error("[mercadopago:webhook] MERCADOPAGO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const cobroWebhookHints = parseMercadoPagoCobroWebhookHints(url.searchParams);
  const payload = await readWebhookPayload(request);
  const parsed = parseMercadoPagoWebhookNotification(url.searchParams, payload);

  console.log("[mercadopago:webhook]", {
    method: request.method,
    topic: parsed.topic,
    type: parsed.queryType ?? parsed.bodyType,
    action: parsed.action,
    id: parsed.queryId,
    data_id: parsed.queryDataId,
    payment_id: parsed.paymentId,
  });

  if (
    !isMercadoPagoPaymentNotification({
      topic: parsed.topic,
      queryType: parsed.queryType,
      bodyType: parsed.bodyType,
      action: parsed.action,
      paymentId: parsed.paymentId,
    })
  ) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const paymentId = parsed.paymentId;
  if (!paymentId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const signatureDataIdFromQuery = parsed.queryDataId?.trim() || null;
  const signatureOk = verifyMercadoPagoWebhookSignature({
    secret,
    xSignature,
    xRequestId,
    dataId: parsed.signatureDataId,
  });
  if (
    shouldRejectMercadoPagoWebhookForSignature({
      xSignature,
      signatureOk,
      signatureDataIdFromQuery,
    })
  ) {
    console.warn("[mercadopago:webhook] invalid_signature", {
      xRequestId,
      hasSig: !!xSignature,
      signatureDataId: parsed.signatureDataId,
      signatureDataIdFromQuery,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const admin = createAdminClient();

  const tryFetchPaymentWithToken = async (accessToken: string) => {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as MercadoPagoPayment | null;
  };

  let saasPayment: MercadoPagoPayment | null = null;
  try {
    const saasToken = getMercadoPagoSaasAccessToken();
    saasPayment = await tryFetchPaymentWithToken(saasToken);
  } catch {
    saasPayment = null;
  }

  if (saasPayment) {
    const saasResult = await processSaasAbonoApprovedPayment(admin, paymentId, saasPayment);
    if (isSaasAbonoPayment(saasPayment)) {
      console.log("[mercadopago:webhook:saas_abono]", { paymentId, reason: saasResult.reason });
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    if (saasResult.handled && saasResult.reason !== "intento_not_found" && saasResult.reason !== "missing_reference") {
      console.log("[mercadopago:webhook:saas_abono]", { paymentId, reason: saasResult.reason });
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  }

  const cobroFetch = await fetchMercadoPagoCobroPayment(admin, paymentId, cobroWebhookHints);
  const payment = cobroFetch?.payment ?? null;
  const matchedNegocioId = cobroFetch?.negocioId ?? null;

  if (!payment || !matchedNegocioId) {
    console.warn("[mercadopago:webhook] payment_not_found_for_any_token", { paymentId });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const metadataNegocioFromPayment =
    typeof payment.metadata?.negocio_id === "string" ? payment.metadata.negocio_id.trim() : null;
  if (metadataNegocioFromPayment && metadataNegocioFromPayment !== matchedNegocioId) {
    console.warn("[mercadopago:webhook] metadata_negocio_mismatch", {
      paymentId,
      metadataNegocioFromPayment,
      matchedNegocioId,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const status = typeof payment.status === "string" ? payment.status : null;
  const preferenceId = typeof payment.preference_id === "string" ? payment.preference_id : null;
  const externalRef = typeof payment.external_reference === "string" ? payment.external_reference : null;
  const metadataIntentoId = typeof payment.metadata?.intento_id === "string" ? payment.metadata.intento_id : null;
  const paidAmount = typeof payment.transaction_amount === "number" ? payment.transaction_amount : null;

  if (status !== "approved") {
    console.log("[mercadopago:webhook] payment_not_approved", { paymentId, status });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const intentoLookupId = metadataIntentoId ?? externalRef;
  if (!intentoLookupId) {
    console.warn("[mercadopago:webhook] missing_reference", { paymentId, externalRef, preferenceId, metadataIntentoId });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { data: intento, error: intentoErr } = await admin
    .from("mp_cobro_intentos")
    .select("id, negocio_id, usuario_id, items, mp_preference_id, consumed_at, venta_id, expected_total_ars")
    .eq("id", intentoLookupId)
    .maybeSingle();
  if (intentoErr || !intento) {
    console.warn("[mercadopago:webhook] intento_not_found", {
      intentoLookupId,
      externalRef,
      metadataIntentoId,
      err: intentoErr?.message,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (intento.negocio_id !== matchedNegocioId) {
    console.warn("[mercadopago:webhook] intento_negocio_mismatch", {
      externalRef,
      intento_negocio_id: intento.negocio_id,
      matchedNegocioId,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (intento.consumed_at || intento.venta_id) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (preferenceId && intento.mp_preference_id !== preferenceId) {
    console.warn("[mercadopago:webhook] preference_mismatch", {
      externalRef,
      intento_mp_preference_id: intento.mp_preference_id,
      preferenceId,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const expectedTotal = await resolveCobroIntentoExpectedTotalArs(
    admin,
    intento.negocio_id,
    intento.expected_total_ars,
    intento.items,
  );
  if (expectedTotal === null || expectedTotal <= 0) {
    console.warn("[mercadopago:webhook] expected_total_unresolved", {
      paymentId,
      intentoId: intento.id,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (paidAmount === null || !mercadoPagoAmountsMatch(expectedTotal, paidAmount)) {
    console.warn("[mercadopago:webhook] amount_mismatch", {
      paymentId,
      expectedTotal,
      paidAmount,
      intentoId: intento.id,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from("mp_cobro_intentos")
    .update({ consumed_at: nowIso })
    .eq("id", intento.id)
    .is("consumed_at", null)
    .is("venta_id", null)
    .select("id")
    .maybeSingle();
  if (claimErr) {
    console.error("[mercadopago:webhook] claim_failed", claimErr.message);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  if (!claimed?.id) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { data: ventaId, error: ventaErr } = await admin.rpc("create_venta_mercadopago_aprobada", {
    p_negocio_id: intento.negocio_id,
    p_usuario_id: intento.usuario_id,
    p_items: intento.items,
    p_mp_preference_id: intento.mp_preference_id,
    p_mp_payment_id: paymentId,
    p_payment_status: status,
  });
  if (ventaErr || !ventaId) {
    console.error("[mercadopago:webhook] create_venta_failed", ventaErr?.message);
    await admin.from("mp_cobro_intentos").update({ consumed_at: null }).eq("id", intento.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await admin.from("mp_cobro_intentos").update({ venta_id: ventaId }).eq("id", intento.id);

  return NextResponse.json({ ok: true }, { status: 200 });
}
