import { NextResponse, type NextRequest } from "next/server";

import { getMercadoPagoClientForAccessToken } from "@/lib/mercadopago/client";
import { buildCheckoutProBackUrls, getPublicSiteBaseUrl } from "@/lib/mercadopago/checkout-pro-urls";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Preference } from "mercadopago";
import type { Items } from "mercadopago/dist/clients/commonTypes";
import type { PreferenceRequest } from "mercadopago/dist/clients/preference/commonTypes";
import crypto from "crypto";

type PostBody = {
  negocioId?: string;
  items?: Array<{
    id?: string;
    title?: string;
    quantity?: number;
    unit_price?: number;
    currency_id?: string;
    description?: string;
    picture_url?: string;
  }>;
  external_reference?: string;
  payer?: { email?: string; name?: string; surname?: string };
  notification_url?: string;
  metadata?: Record<string, unknown>;
};

function parseBody(json: unknown): PostBody | null {
  if (!json || typeof json !== "object") return null;
  return json as PostBody;
}

function normalizeItems(items: NonNullable<PostBody["items"]>): Items[] {
  return items.map((item, index) => ({
    id: item.id ?? `line-${index}`,
    title: item.title!.trim(),
    quantity: item.quantity!,
    unit_price: item.unit_price!,
    currency_id: item.currency_id ?? "ARS",
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.picture_url !== undefined ? { picture_url: item.picture_url } : {}),
  }));
}

function getMercadoPagoWebhookUrl() {
  const base = getPublicSiteBaseUrl();
  return `${base}/api/mercadopago/webhook`;
}

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseBody(json);
  const negocioId = body?.negocioId?.trim();
  if (!negocioId) {
    return NextResponse.json({ error: "Falta negocioId" }, { status: 400 });
  }
  if (!body?.items?.length) {
    return NextResponse.json({ error: "Expected a non-empty items array" }, { status: 400 });
  }

  for (const [i, item] of body.items.entries()) {
    if (typeof item.title !== "string" || !item.title.trim()) {
      return NextResponse.json({ error: `items[${i}].title is required` }, { status: 400 });
    }
    if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      return NextResponse.json({ error: `items[${i}].quantity must be a positive number` }, { status: 400 });
    }
    if (typeof item.unit_price !== "number" || !Number.isFinite(item.unit_price) || item.unit_price < 0) {
      return NextResponse.json({ error: `items[${i}].unit_price must be a number >= 0` }, { status: 400 });
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validar acceso al negocio usando RLS (no alcanza con confiar en el negocioId del cliente).
  const { data: negocio, error: negocioErr } = await supabase.from("negocios").select("id").eq("id", negocioId).single();
  if (negocioErr || !negocio) {
    return NextResponse.json({ error: "Negocio no encontrado o sin permisos" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: oauthRow, error: oauthErr } = await admin
    .from("negocio_mercadopago_oauth")
    .select("access_token")
    .eq("negocio_id", negocioId)
    .maybeSingle();
  if (oauthErr) {
    return NextResponse.json({ error: oauthErr.message }, { status: 500 });
  }
  if (!oauthRow?.access_token) {
    return NextResponse.json({ error: "Mercado Pago no está conectado para este negocio" }, { status: 409 });
  }

  try {
    const baseUrl = getPublicSiteBaseUrl();
    const back_urls = buildCheckoutProBackUrls(baseUrl);

    const intentoId = crypto.randomUUID();
    const intentoItems = body.items.map((it) => ({
      producto_id: it.id,
      qty: it.quantity,
    }));

    const prefBody: PreferenceRequest = {
      items: normalizeItems(body.items),
      back_urls,
      auto_return: "approved",
      // Always use our intentoId so the webhook can correlate reliably.
      external_reference: intentoId,
      ...(body.payer !== undefined ? { payer: body.payer } : {}),
      notification_url: body.notification_url?.trim() || getMercadoPagoWebhookUrl(),
      metadata: {
        ...(body.metadata ?? {}),
        intento_id: intentoId,
        negocio_id: negocioId,
      },
    };

    const preference = new Preference(getMercadoPagoClientForAccessToken(oauthRow.access_token));
    const created = await preference.create({ body: prefBody });

    const id = created.id;
    if (!id) {
      throw new Error("Mercado Pago preference response did not include an id");
    }

    // Crear intento (service_role). Se consume al aprobar el pago vía webhook.
    const { data: intentoRow, error: intentoErr } = await admin
      .from("mp_cobro_intentos")
      .insert({
        id: intentoId,
        negocio_id: negocioId,
        usuario_id: user.id,
        items: intentoItems,
        mp_preference_id: id,
      })
      .select("id")
      .single();
    if (intentoErr || !intentoRow?.id) {
      throw new Error(intentoErr?.message || "No se pudo crear el intento de cobro.");
    }

    // Si el caller no mandó external_reference, retornamos el id del intento para que el caller lo use en futuras versiones.
    // (Para MP, idealmente esto debería enviarse como external_reference al crear la preferencia; por ahora lo usamos como correlación interna.)

    return NextResponse.json({
      id,
      init_point: created.init_point,
      sandbox_init_point: created.sandbox_init_point,
      intento_id: intentoRow.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

