import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

import { createCheckoutProPreferenceSaas } from "@/lib/mercadopago/checkout-pro-preference";
import { getMercadoPagoSaasAbonoWebhookUrl, resolveSaasAbonoPlan } from "@/lib/mercadopago/saas-abono-plan";
import { getPublicSiteBaseUrl } from "@/lib/mercadopago/checkout-pro-urls";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type PostBody = {
  plan?: string;
};

function parseBody(json: unknown): PostBody | null {
  if (json === null || json === undefined) {
    return {};
  }
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (o.plan !== undefined && typeof o.plan !== "string") return null;
  return { plan: typeof o.plan === "string" ? o.plan : undefined };
}

export async function POST(request: NextRequest) {
  let json: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      json = JSON.parse(text) as unknown;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseBody(json);
  if (body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let plan;
  try {
    plan = resolveSaasAbonoPlan(body.plan);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Plan no disponible";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const intentoId = crypto.randomUUID();
  const baseUrl = getPublicSiteBaseUrl();
  const notificationUrl = getMercadoPagoSaasAbonoWebhookUrl(baseUrl);

  try {
    const preference = await createCheckoutProPreferenceSaas({
      items: [
        {
          id: `abono-${plan.code}`,
          title: plan.title,
          quantity: plan.quantity,
          unit_price: plan.unitPriceArs,
          currency_id: plan.currencyId,
        },
      ],
      external_reference: intentoId,
      notification_url: notificationUrl,
      metadata: {
        kind: "saas_abono",
        intento_id: intentoId,
        plan_code: plan.code,
        usuario_id: user.id,
      },
      payer: user.email ? { email: user.email } : undefined,
    });

    const admin = createAdminClient();
    const { data: intentoRow, error: intentoErr } = await admin
      .from("mp_saas_abono_intentos")
      .insert({
        id: intentoId,
        usuario_id: user.id,
        plan_code: plan.code,
        expected_total_ars: plan.unitPriceArs,
        mp_preference_id: preference.id,
      })
      .select("id")
      .single();

    if (intentoErr || !intentoRow?.id) {
      throw new Error(intentoErr?.message || "No se pudo registrar el intento de abono.");
    }

    return NextResponse.json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
      intento_id: intentoRow.id,
      plan_code: plan.code,
      amount_ars: plan.unitPriceArs,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
