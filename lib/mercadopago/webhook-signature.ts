import crypto from "crypto";

export function parseMercadoPagoXSignature(header: string | null): { ts: string | null; v1: string | null } {
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

/** Builds the manifest and verifies `x-signature` per Mercado Pago webhook docs. */
export function verifyMercadoPagoWebhookSignature(input: {
  secret: string;
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const { ts, v1 } = parseMercadoPagoXSignature(input.xSignature);
  if (!ts || !v1 || !input.xRequestId || !input.dataId) return false;
  const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${ts};`;
  const computed = crypto.createHmac("sha256", input.secret).update(manifest).digest("hex");
  return safeEqualHex(computed, v1);
}

/**
 * Por defecto exigimos `x-signature` (más seguro). QR/IPN sin firma: `MERCADOPAGO_WEBHOOK_ALLOW_UNSIGNED=true`.
 * Compat: `MERCADOPAGO_WEBHOOK_ENFORCE_SIGNATURE=false` sigue permitiendo notificaciones sin firma.
 */
export function mercadoPagoWebhookRequiresSignatureHeader(): boolean {
  const allowUnsigned = (process.env.MERCADOPAGO_WEBHOOK_ALLOW_UNSIGNED ?? "").trim().toLowerCase() === "true";
  if (allowUnsigned) return false;

  const legacyEnforce = (process.env.MERCADOPAGO_WEBHOOK_ENFORCE_SIGNATURE ?? "").trim().toLowerCase();
  if (legacyEnforce === "false") return false;
  if (legacyEnforce === "true") return true;

  return true;
}

/**
 * When MP sends `x-signature` and `data.id` is present in the query string, a bad signature rejects the notification.
 *
 * Checkout Pro `notification_url` (per-preference) and legacy IPN may send `x-signature` without a verifiable
 * `data.id` query param; MP documents that those URLs cannot be validated with the app secret. In that case we
 * continue and rely on GET /v1/payments/{id} + amount/intento checks (see webhook route).
 *
 * When the header is absent, rejection follows {@link mercadoPagoWebhookRequiresSignatureHeader}.
 */
export function shouldRejectMercadoPagoWebhookForSignature(input: {
  xSignature: string | null;
  signatureOk: boolean;
  /** Query `data.id` used for the HMAC manifest (Webhooks v2). */
  signatureDataIdFromQuery: string | null;
  enforceWhenHeaderMissing?: boolean;
}): boolean {
  const enforceWhenHeaderMissing = input.enforceWhenHeaderMissing ?? mercadoPagoWebhookRequiresSignatureHeader();
  const hasSigHeader = !!input.xSignature?.trim();
  if (hasSigHeader && input.signatureOk) return false;
  if (hasSigHeader && !input.signatureOk) {
    const canStrictlyValidate = !!input.signatureDataIdFromQuery?.trim();
    return canStrictlyValidate;
  }
  if (!hasSigHeader && enforceWhenHeaderMissing) return true;
  return false;
}
