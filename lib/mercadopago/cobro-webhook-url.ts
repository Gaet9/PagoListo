import { getPublicSiteBaseUrl } from "@/lib/mercadopago/checkout-pro-urls";

export type CobroWebhookUrlHint = {
  negocioId: string;
  intentoId: string;
};

/** URL de IPN para cobro en tienda; incluye hints para evitar escanear todos los OAuth. */
export function buildMercadoPagoCobroWebhookUrl(hint: CobroWebhookUrlHint): string {
  const base = getPublicSiteBaseUrl().replace(/\/$/, "");
  const url = new URL(`${base}/api/mercadopago/webhook`);
  url.searchParams.set("negocio_id", hint.negocioId.trim());
  url.searchParams.set("intento_id", hint.intentoId.trim());
  return url.toString();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseMercadoPagoCobroWebhookHints(searchParams: URLSearchParams): {
  negocioId: string | null;
  intentoId: string | null;
} {
  const negocioRaw = searchParams.get("negocio_id")?.trim() ?? "";
  const intentoRaw = searchParams.get("intento_id")?.trim() ?? "";
  const negocioId = UUID_RE.test(negocioRaw) ? negocioRaw : null;
  const intentoId = UUID_RE.test(intentoRaw) ? intentoRaw : null;
  return { negocioId, intentoId };
}
