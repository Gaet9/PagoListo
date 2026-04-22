import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function parseXSignature(header: string | null): { ts: string | null; v1: string | null } {
    if (!header) return { ts: null, v1: null };
    let ts: string | null = null;
    let v1: string | null = null;
    for (const part of header.split(",")) {
        const [kRaw, vRaw] = part.split("=", 2);
        const k = kRaw?.trim();
        const v = vRaw?.trim();
        if (!k || !v) continue;
        if (k === "ts") ts = v;
        if (k === "v1") v1 = v;
    }
    return { ts, v1 };
}

function safeEqualHex(a: string, b: string) {
    try {
        const ba = Buffer.from(a, "hex");
        const bb = Buffer.from(b, "hex");
        if (ba.length !== bb.length) return false;
        return crypto.timingSafeEqual(ba, bb);
    } catch {
        return false;
    }
}

function verifyMercadoPagoWebhookSignature(input: {
    secret: string;
    xSignature: string | null;
    xRequestId: string | null;
    dataId: string | null;
}) {
    const { ts, v1 } = parseXSignature(input.xSignature);
    if (!ts || !v1 || !input.xRequestId || !input.dataId) return false;
    const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${ts};`;
    const computed = crypto.createHmac("sha256", input.secret).update(manifest).digest("hex");
    return safeEqualHex(computed, v1);
}

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
    metadata?: { intento_id?: string };
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
    const enforceSignature = (process.env.MERCADOPAGO_WEBHOOK_ENFORCE_SIGNATURE ?? "").trim().toLowerCase() === "true";

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

    // Best-effort extraction of payment id from query/body
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

    // Only process payment notifications for now.
    if (!paymentId || (topic !== "payment" && type !== "payment" && bodyType !== "payment")) {
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Signature verification (Mercado Pago Webhooks). See docs:
    // https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");
    // MP docs use data.id from the notification as the signed id.
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
    if (!signatureOk) {
        // Per MP docs, some notifications (notably QR) may not be verifiable with secret signature.
        // We treat signature as best-effort, and rely on fetching the payment from MP API + matching intento_id.
        console.warn("[mercadopago:webhook] invalid_signature", { xRequestId, hasSig: !!xSignature, signatureDataId, enforceSignature });
        if (enforceSignature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
    }

    const admin = createAdminClient();

    // Try to fetch payment details using each connected negocio token until one works.
    // This is acceptable for now (small # of negocios) and avoids needing to know negocio_id beforehand.
    const { data: tokens, error: tokensErr } = await admin.from("negocio_mercadopago_oauth").select("negocio_id, access_token").limit(50);
    if (tokensErr) {
        console.error("[mercadopago:webhook] tokens_error", tokensErr.message);
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    let payment: MercadoPagoPayment | null = null;
    let matchedNegocioId: string | null = null;

    for (const row of tokens ?? []) {
        try {
            const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
                method: "GET",
                headers: { Authorization: `Bearer ${row.access_token}` },
            });
            if (!res.ok) continue;
            payment = (await res.json().catch(() => null)) as MercadoPagoPayment | null;
            if (payment) {
                matchedNegocioId = row.negocio_id;
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

    const status = typeof payment?.status === "string" ? payment.status : null;
    const preferenceId = typeof payment?.preference_id === "string" ? payment.preference_id : null;
    const externalRef = typeof payment?.external_reference === "string" ? payment.external_reference : null;
    const metadataIntentoId = typeof payment?.metadata?.intento_id === "string" ? payment.metadata.intento_id : null;

    if (status !== "approved") {
        console.log("[mercadopago:webhook] payment_not_approved", { paymentId, status });
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    const intentoLookupId = metadataIntentoId ?? externalRef;
    if (!intentoLookupId) {
        console.warn("[mercadopago:webhook] missing_reference", { paymentId, externalRef, preferenceId, metadataIntentoId });
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    // external_reference is our intentoId (uuid) → load items/user and create venta in one transaction (RPC).
    const { data: intento, error: intentoErr } = await admin
        .from("mp_cobro_intentos")
        .select("id, negocio_id, usuario_id, items, mp_preference_id, consumed_at, venta_id")
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
        // Already processed
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

    // Atomic claim to avoid double-processing when MP retries webhooks.
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
        // Another webhook already claimed/processed it.
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
        // Release claim so a retry can attempt again.
        await admin.from("mp_cobro_intentos").update({ consumed_at: null }).eq("id", intento.id);
        return NextResponse.json({ ok: true }, { status: 200 });
    }

    await admin.from("mp_cobro_intentos").update({ venta_id: ventaId }).eq("id", intento.id);

    return NextResponse.json({ ok: true }, { status: 200 });
}
