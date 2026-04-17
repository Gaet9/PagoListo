import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

import { createMercadoPagoOAuthState } from "@/lib/mercadopago/oauth-state";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const negocioId = searchParams.get("negocio_id");
  if (!negocioId) {
    return NextResponse.redirect(
      new URL("/perfil?mp_error=falta_negocio", origin),
    );
  }

  const clientId = process.env.MERCADOPAGO_APP_ID;
  const redirectUri =
    process.env.MERCADOPAGO_REDIRECT_URI ?? `${origin}/mercadopago/callback`;

  if (!clientId) {
    return NextResponse.redirect(
      new URL("/perfil?mp_error=falta_config", origin),
    );
  }

  const state = createMercadoPagoOAuthState(negocioId);
  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("platform_id", "mp");

  redirect(url.toString());
}

