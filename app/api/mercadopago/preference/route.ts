import { NextResponse, type NextRequest } from "next/server";

import { mercadoPagoCobroPreferenceErrorMessage } from "@/lib/mercadopago/cobro-preference-api-error";
import { resolveCobroPreferenceLines, type CobroLineRequest } from "@/lib/mercadopago/cobro-preference-lines";
import { getMercadoPagoClientForAccessToken } from "@/lib/mercadopago/client";
import { buildMercadoPagoCobroWebhookUrl } from "@/lib/mercadopago/cobro-webhook-url";
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

function mercadoPagoSdkErrorMessage(e: unknown): { message: string; status?: number } {
  if (e && typeof e === "object") {
    const rec = e as Record<string, unknown>;
    const status = typeof rec.status === "number" ? rec.status : undefined;
    const message =
      typeof rec.message === "string" ? rec.message
      : typeof rec.error === "string" ? rec.error
      : e instanceof Error ? e.message
      : "Unknown error";
    return { message, status };
  }
  return { message: e instanceof Error ? e.message : "Unknown error" };
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
    return NextResponse.json({ error: "El carrito debe tener al menos un producto" }, { status: 400 });
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

  const intentoId = crypto.randomUUID();

  const { error: intentoInsertErr } = await admin.from("mp_cobro_intentos").insert({
    id: intentoId,
    negocio_id: negocioId,
    usuario_id: user.id,
    items: resolved.intentoItems,
    mp_preference_id: null,
    expected_total_ars: resolved.expectedTotalArs,
  });
  if (intentoInsertErr) {
    return NextResponse.json(
      { error: intentoInsertErr.message || "No se pudo crear el intento de cobro." },
      { status: 500 },
    );
  }

  try {
    const baseUrl = getPublicSiteBaseUrl();
    const back_urls = buildCheckoutProBackUrls(baseUrl);

    const prefBody: PreferenceRequest = {
      items: resolved.mpItems,
      back_urls,
      auto_return: "approved",
      external_reference: intentoId,
      notification_url: buildMercadoPagoCobroWebhookUrl({ negocioId, intentoId }),
      metadata: {
        intento_id: intentoId,
        negocio_id: negocioId,
      },
    };

    const preference = new Preference(getMercadoPagoClientForAccessToken(accessToken));
    const created = await preference.create({ body: prefBody });

    const id = created.id;
    if (!id) {
      throw new Error("Mercado Pago no devolvió el id de la preferencia");
    }

    const { error: intentoUpdateErr } = await admin
      .from("mp_cobro_intentos")
      .update({ mp_preference_id: id })
      .eq("id", intentoId);
    if (intentoUpdateErr) {
      throw new Error(intentoUpdateErr.message || "No se pudo actualizar el intento de cobro.");
    }

    return NextResponse.json({
      id,
      init_point: created.init_point,
      sandbox_init_point: created.sandbox_init_point,
      intento_id: intentoId,
    });
  } catch (e) {
    await admin.from("mp_cobro_intentos").delete().eq("id", intentoId);
    const { message, status } = mercadoPagoSdkErrorMessage(e);
    const friendly = mercadoPagoCobroPreferenceErrorMessage(message, status);
    const httpStatus = status === 401 || status === 403 ? status : 502;
    return NextResponse.json({ error: friendly }, { status: httpStatus });
  }
}
