import { NextResponse, type NextRequest } from "next/server";

import { mercadoPagoAmountsMatch } from "@/lib/mercadopago/cobro-amount";
import { getMercadoPagoAccessTokenForNegocio } from "@/lib/mercadopago/negocio-access-token";
import {
  shouldRejectMercadoPagoWebhookForSignature,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago/webhook-signature";
import { createAdminClient } from "@/lib/supabase/admin";

type MercadoPagoWebhookPayload = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
  id?: string | number;
};

type MercadoPagoPayment = {
  status?: string;
  preference_id?: string | null;
  external_reference?: string | null;
  transaction_amount?: number;
  metadata?: { intento_id?: string; negocio_id?: string };
};

/**
 * Webhook receptor para Mercado Pago.
 *
 * Valida el pago consultando la API de MP (status) y crea la venta SOLO cuando está aprobado.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null;
  if (!secret) {
    console.error("[mercadopago:webhook] MERCADOPAGO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }
  const enforceSignatureWhenHeaderMissing =
    (process.env.MERCADOPAGO_WEBHOOK_ENFORCE_SIGNATURE ?? "").trim().toLowerCase() === "true";

  const url = new URL(request.url);
  const topic = url.searchParams.get("topic") ?? undefined;
  const id = url.searchParams.get("id") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const dataId = url.searchParams.get("data.id") ?? undefined;

  const ct = request.headers.get("content-type") ?? "";

  let payload: unknown = null;
  if (ct.includes("application/json")) {
    payload = await request.json().catch(() => null);
  } else {
    const text = await request.text().catch(() => "");
    payload = { raw: text };
  }

  const p = (payload ?? null) as MercadoPagoWebhookPayload | null;
  const bodyType = typeof p?.type === "string" ? p.type : undefined;
  const action = typeof p?.action === "string" ? p.action : undefined;
  const bodyId = p?.data?.id ?? p?.id ?? undefined;
  const paymentIdRaw = (topic === "payment" ? id : undefined) ?? (type === "payment" ? dataId : undefined) ?? bodyId;
  const paymentId = typeof paymentIdRaw === "string" || typeof paymentIdRaw === "number" ? String(paymentIdRaw) : null;

  console.log("[mercadopago:webhook]", {
    topic,
    type: type ?? bodyType,
    action,
    id,
    data_id: dataId,
    payment_id: paymentId,
  });

  if (!paymentId || (topic !== "payment" && type !== "payment" && bodyType !== "payment")) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const signatureDataId =
    (typeof p?.data?.id === "string" || typeof p?.data?.id === "number" ? String(p.data.id) : null) ??
    (typeof dataId === "string" ? dataId : null) ??
    (typeof id === "string" ? id : null) ??
    paymentId;
  const signatureOk = verifyMercadoPagoWebhookSignature({
    secret,
    xSignature,
    xRequestId,
    dataId: signatureDataId,
  });
  if (
    shouldRejectMercadoPagoWebhookForSignature({
      xSignature,
      signatureOk,
      enforceWhenHeaderMissing: enforceSignatureWhenHeaderMissing,
    })
  ) {
    console.warn("[mercadopago:webhook] invalid_signature", {
      xRequestId,
      hasSig: !!xSignature,
      signatureDataId,
      enforceSignatureWhenHeaderMissing,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const admin = createAdminClient();

  let matchedNegocioId: string | null = null;
  let payment: MercadoPagoPayment | null = null;

  const tryFetchPayment = async (negocioId: string) => {
    const accessToken = await getMercadoPagoAccessTokenForNegocio(admin, negocioId);
    if (!accessToken) return null;
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as MercadoPagoPayment | null;
  };

  const { data: tokenRows, error: tokensErr } = await admin.from("negocio_mercadopago_oauth").select("negocio_id").limit(200);
  if (tokensErr) {
    console.error("[mercadopago:webhook] tokens_error", tokensErr.message);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  for (const row of tokenRows ?? []) {
    const negocioId = row.negocio_id as string;
    try {
      const fetched = await tryFetchPayment(negocioId);
      if (fetched) {
        payment = fetched;
        matchedNegocioId = negocioId;
        break;
      }
    } catch {
      // ignore and keep trying
    }
  }

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
    console.warn("[mercadopago:webhook] intento_not_found", { intentoLookupId, externalRef, metadataIntentoId, err: intentoErr?.message });
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

  const expectedTotalRaw = intento.expected_total_ars;
  const expectedTotal =
    expectedTotalRaw === null || expectedTotalRaw === undefined ?
      null
    : typeof expectedTotalRaw === "number" ?
      expectedTotalRaw
    : parseFloat(String(expectedTotalRaw));
  if (expectedTotal !== null && Number.isFinite(expectedTotal) && expectedTotal > 0) {
    if (paidAmount === null || !mercadoPagoAmountsMatch(expectedTotal, paidAmount)) {
      console.warn("[mercadopago:webhook] amount_mismatch", {
        paymentId,
        expectedTotal,
        paidAmount,
        intentoId: intento.id,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }
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
