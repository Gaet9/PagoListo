import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { parseMercadoPagoOAuthState } from "@/lib/mercadopago/oauth-state";

type MercadoPagoTokenResponse = {
  access_token: string;
  refresh_token: string;
  user_id: number;
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(
        `/perfil?mp_error=${encodeURIComponent(errorDescription)}`,
        origin,
      ),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/perfil?mp_error=falta_code", origin));
  }

  const payload = parseMercadoPagoOAuthState(state);
  if (!payload) {
    return NextResponse.redirect(new URL("/perfil?mp_error=state_invalido", origin));
  }

  const clientId = process.env.MERCADOPAGO_APP_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  const redirectUri =
    process.env.MERCADOPAGO_REDIRECT_URI ?? `${origin}/mercadopago/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/perfil?mp_error=falta_config", origin));
  }

  const tokenRes = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.redirect(
      new URL(`/perfil?mp_error=oauth_token&detail=${encodeURIComponent(text)}`, origin),
    );
  }

  const json = (await tokenRes.json()) as MercadoPagoTokenResponse;
  if (!json?.access_token || !json?.refresh_token || !json?.user_id) {
    return NextResponse.redirect(new URL("/perfil?mp_error=res_invalida", origin));
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { error: upsertErr } = await supabase
    .from("mercadopago_conexiones")
    .upsert(
      {
        negocio_id: payload.negocio_id,
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        mp_user_id: json.user_id,
      },
      { onConflict: "negocio_id" },
    );

  if (upsertErr) {
    return NextResponse.redirect(
      new URL(`/perfil?mp_error=db&detail=${encodeURIComponent(upsertErr.message)}`, origin),
    );
  }

  return NextResponse.redirect(new URL("/perfil?mp_ok=1", origin));
}

