import { NextResponse, type NextRequest } from "next/server";

import { disconnectNegocioMercadoPagoOAuth } from "@/lib/mercadopago/disconnect-negocio-oauth";
import { createClient } from "@/lib/supabase/server";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function handleDisconnect(request: NextRequest) {
  let negocioId: string | null = request.nextUrl.searchParams.get("negocioId")?.trim() ?? null;

  if (!negocioId && request.method === "POST") {
    try {
      const body = (await request.json()) as { negocioId?: unknown };
      if (typeof body.negocioId === "string" && body.negocioId.trim()) {
        negocioId = body.negocioId.trim();
      }
    } catch {
      // empty body is ok if negocioId was in query
    }
  }

  if (!negocioId) return badRequest("Falta negocioId");

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: negocio, error: negocioErr } = await supabase
    .from("negocios")
    .select("id")
    .eq("id", negocioId)
    .single();
  if (negocioErr || !negocio) {
    return NextResponse.json({ error: "Negocio no encontrado o sin permisos" }, { status: 404 });
  }

  const result = await disconnectNegocioMercadoPagoOAuth(negocioId);
  if (!result.ok) {
    return NextResponse.json(
      { error: "No se pudo desvincular Mercado Pago. Reintentá en unos minutos." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    connected: false,
    disconnected: result.wasConnected,
    already_disconnected: !result.wasConnected,
  });
}

export async function POST(request: NextRequest) {
  return handleDisconnect(request);
}

export async function DELETE(request: NextRequest) {
  return handleDisconnect(request);
}
