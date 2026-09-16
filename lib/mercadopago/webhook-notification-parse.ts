export type MercadoPagoWebhookPayload = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
  id?: string | number;
};

export type ParsedMercadoPagoWebhookNotification = {
  topic: string | undefined;
  queryType: string | undefined;
  queryId: string | undefined;
  queryDataId: string | undefined;
  bodyType: string | undefined;
  action: string | undefined;
  paymentId: string | null;
  signatureDataId: string | null;
};

function asIdString(raw: string | number | undefined | null): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return null;
}

/** True when the notification refers to a payment resource (Webhooks v2, IPN, or action payment.*). */
export function isMercadoPagoPaymentNotification(input: {
  topic?: string;
  queryType?: string;
  bodyType?: string;
  action?: string;
  paymentId: string | null;
}): boolean {
  if (!input.paymentId) return false;
  if (input.topic === "payment") return true;
  if (input.queryType === "payment") return true;
  if (input.bodyType === "payment") return true;
  if (typeof input.action === "string" && input.action.toLowerCase().startsWith("payment.")) {
    return true;
  }
  return false;
}

export function parseMercadoPagoWebhookNotification(
  searchParams: URLSearchParams,
  payload: unknown,
): ParsedMercadoPagoWebhookNotification {
  const topic = searchParams.get("topic") ?? undefined;
  const queryId = searchParams.get("id") ?? undefined;
  const queryType = searchParams.get("type") ?? undefined;
  const queryDataId = searchParams.get("data.id") ?? undefined;

  const p = (payload ?? null) as MercadoPagoWebhookPayload | null;
  const bodyType = typeof p?.type === "string" ? p.type : undefined;
  const action = typeof p?.action === "string" ? p.action : undefined;
  const bodyDataId = asIdString(p?.data?.id);
  const bodyTopId = asIdString(p?.id);

  const paymentIdRaw =
    (topic === "payment" ? queryId : undefined) ??
    (queryType === "payment" ? queryDataId : undefined) ??
    bodyDataId ??
    bodyTopId ??
    (queryType === "payment" ? undefined : queryDataId) ??
    queryId;

  const paymentId = asIdString(paymentIdRaw);

  // MP docs: manifest uses query `data.id` when present (Webhooks v2).
  const signatureDataId =
    asIdString(queryDataId) ?? bodyDataId ?? asIdString(queryId) ?? paymentId;

  return {
    topic,
    queryType,
    queryId,
    queryDataId,
    bodyType,
    action,
    paymentId,
    signatureDataId,
  };
}
