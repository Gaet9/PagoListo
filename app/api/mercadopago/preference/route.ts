import { NextResponse, type NextRequest } from "next/server";

import { resolveCobroPreferenceLines, type CobroLineRequest } from "@/lib/mercadopago/cobro-preference-lines";
import { getMercadoPagoClientForAccessToken } from "@/lib/mercadopago/client";
import { buildCheckoutProBackUrls, getPublicSiteBaseUrl } from "@/lib/mercadopago/checkout-pro-urls";
import { getMercadoPagoAccessTokenForNegocio } from "@/lib/mercadopago/negocio-access-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Preference } from "mercadopago";
import type { PreferenceRequest } from "mercadopago/dist/clients/preference/commonTypes";
import crypto from "crypto";

type PostBody = {
  negocioId?: string;
  items?: CobroLineRequest[];
};

function parseBody(json: unknown): PostBody | null {
  if (!json || typeof json !== "object") return null;
  return json as PostBody;
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

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: negocio, error: negocioErr } = await supabase.from("negocios").select("id").eq("id", negocioId).single();
  if (negocioErr || !negocio) {
    return NextResponse.json({ error: "Negocio no encontrado o sin permisos" }, { status: 404 });
  }

  const admin = createAdminClient();
  const resolved = await resolveCobroPreferenceLines(admin, negocioId, body.items);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const accessToken = await getMercadoPagoAccessTokenForNegocio(admin, negocioId);
  if (!accessToken) {
    return NextResponse.json({ error: "Mercado Pago no está conectado para este negocio" }, { status: 409 });
  }

  try {
    const baseUrl = getPublicSiteBaseUrl();
    const back_urls = buildCheckoutProBackUrls(baseUrl);

    const intentoId = crypto.randomUUID();

    const prefBody: PreferenceRequest = {
      items: resolved.mpItems,
      back_urls,
      auto_return: "approved",
      external_reference: intentoId,
      notification_url: getMercadoPagoWebhookUrl(),
      metadata: {
        intento_id: intentoId,
        negocio_id: negocioId,
      },
    };

    const preference = new Preference(getMercadoPagoClientForAccessToken(accessToken));
    const created = await preference.create({ body: prefBody });

    const id = created.id;
    if (!id) {
      throw new Error("Mercado Pago preference response did not include an id");
    }

    const { data: intentoRow, error: intentoErr } = await admin
      .from("mp_cobro_intentos")
      .insert({
        id: intentoId,
        negocio_id: negocioId,
        usuario_id: user.id,
        items: resolved.intentoItems,
        mp_preference_id: id,
        expected_total_ars: resolved.expectedTotalArs,
      })
      .select("id")
      .single();
    if (intentoErr || !intentoRow?.id) {
      throw new Error(intentoErr?.message || "No se pudo crear el intento de cobro.");
    }

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
