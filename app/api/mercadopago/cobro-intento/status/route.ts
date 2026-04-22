import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const intentoId = url.searchParams.get("intentoId")?.trim();
  if (!intentoId) return badRequest("Falta intentoId");

  // Require a logged-in user (POS UI), but reads are done with service_role.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("mp_cobro_intentos")
    .select("id, negocio_id, usuario_id, consumed_at, venta_id, created_at")
    .eq("id", intentoId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 });
  }

  // Only the same user that created the intento can poll its status.
  if (row.usuario_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    intento_id: row.id,
    venta_id: row.venta_id ?? null,
    approved: !!row.venta_id,
    consumed_at: row.consumed_at ?? null,
    created_at: row.created_at,
  });
}

