import { type NextRequest } from "next/server";

import { handleMercadoPagoWebhookRequest } from "@/lib/mercadopago/webhook-route-handler";

/** Webhooks v2 (POST JSON + query data.id). */
export async function POST(request: NextRequest) {
  return handleMercadoPagoWebhookRequest(request);
}

/** Legacy IPN: GET ?topic=payment&id={payment_id} hacia notification_url de la preferencia. */
export async function GET(request: NextRequest) {
  return handleMercadoPagoWebhookRequest(request);
}
