import { NextResponse, type NextRequest } from "next/server";

import { disconnectNegocioMercadoPagoOAuth } from "@/lib/mercadopago/disconnect-negocio-oauth";
import { createClient } from "@/lib/supabase/server";

/** GAE-8: revoke + delete server-side (GAE-37 / #25 client uses MERCADOPAGO_OAUTH_UNLINK_API_PATH). */
export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const body = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  const negocioId = body && typeof body.negocioId === "string" ? body.negocioId.trim() : "";
  const strictRevoke = body?.strictRevoke === true;
  if (!negocioId) {
    return NextResponse.json({ error: "Falta negocioId" }, { status: 400 });
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

  const result = await disconnectNegocioMercadoPagoOAuth(negocioId, {
    failClosedWhenStoredTokensExist: strictRevoke,
  });
  if (!result.ok) {
    return NextResponse.json({ error: "No se pudo desvincular Mercado Pago. Reintentá en unos minutos." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
