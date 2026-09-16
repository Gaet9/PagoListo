import { NextResponse, type NextRequest } from "next/server";

import { buildMercadoPagoAuthorizeUrl, newOAuthState, newPkceCodeVerifier, pkceChallengeS256 } from "@/lib/mercadopago/oauth";
import { areEquivalentSiteOrigins, getConfiguredSiteOrigin } from "@/lib/mercadopago/oauth-site-host";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function serverError() {
  return NextResponse.json({ error: "No se pudo iniciar la vinculación. Reintentá en unos minutos." }, { status: 500 });
}

function sanitizeRedirectTo(request: NextRequest, raw: string | null): string | null {
  const v = raw?.trim();
  if (!v) return null;

  // Relative same-site paths are OK (and safest for deep-linking back to `/tiendas/[slug]`).
  if (v.startsWith("/") && !v.startsWith("//")) return v;

  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;

    const canonical = getConfiguredSiteOrigin();
    const sameAsRequest = u.origin === request.nextUrl.origin;
    const sameAsCanonical = canonical ? areEquivalentSiteOrigins(u.origin, canonical) : false;
    const sameSiteAsRequest = areEquivalentSiteOrigins(u.origin, request.nextUrl.origin);

    if (!sameAsRequest && !sameAsCanonical && !sameSiteAsRequest) return null;

    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const negocioId = url.searchParams.get("negocioId")?.trim();
  const redirectTo = sanitizeRedirectTo(request, url.searchParams.get("redirectTo"));

  if (!negocioId) return badRequest("Falta negocioId");

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validar que el usuario pueda ver el negocio (RLS debe filtrar).
  const { data: negocio, error: negocioErr } = await supabase
    .from("negocios")
    .select("id")
    .eq("id", negocioId)
    .single();
  if (negocioErr || !negocio) {
    return NextResponse.json({ error: "Negocio no encontrado o sin permisos" }, { status: 404 });
  }

  const state = newOAuthState();
  const codeVerifier = newPkceCodeVerifier();
  const codeChallenge = pkceChallengeS256(codeVerifier);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { error: insertErr } = await admin.from("mp_oauth_states").insert({
    state,
    negocio_id: negocioId,
    requested_by: user.id,
    redirect_to: redirectTo,
    expires_at: expiresAt,
    code_verifier: codeVerifier,
  });
  if (insertErr) {
    console.error("[mp-oauth/start] mp_oauth_states insert failed", insertErr.message);
    return serverError();
  }

  const authUrl = buildMercadoPagoAuthorizeUrl({ state, codeChallenge });
  return NextResponse.redirect(authUrl);
}

