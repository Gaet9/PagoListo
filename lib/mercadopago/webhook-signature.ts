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
 * When MP sends `x-signature`, a bad signature must reject the notification.
 * When the header is absent (some QR flows), verification is skipped and other checks apply.
 */
export function shouldRejectMercadoPagoWebhookForSignature(input: {
  xSignature: string | null;
  signatureOk: boolean;
  enforceWhenHeaderMissing: boolean;
}): boolean {
  const hasSigHeader = !!input.xSignature?.trim();
  if (hasSigHeader && !input.signatureOk) return true;
  if (!hasSigHeader && input.enforceWhenHeaderMissing) return true;
  return false;
}
