import { NextResponse, type NextRequest } from "next/server";

import { cancelUserSubscription } from "@/lib/auth/cancel-user-subscription";
import { denyUnlessSaasManager } from "@/lib/auth/negocio-manager-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function parseNegocioId(json: unknown): string | undefined {
  if (!json || typeof json !== "object") {
    return undefined;
  }
  const raw = (json as { negocioId?: unknown }).negocioId;
  return typeof raw === "string" ? raw : undefined;
}

export async function POST(request: NextRequest) {
  let negocioId: string | undefined;
  try {
    const text = await request.text();
    if (text.trim()) {
      negocioId = parseNegocioId(JSON.parse(text) as unknown);
    }
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const saasDenied = await denyUnlessSaasManager(supabase, user.id, negocioId);
  if (saasDenied) {
    return saasDenied;
  }

  const admin = createAdminClient();
  const result = await cancelUserSubscription(admin, user.id);

  if (!result.ok) {
    const status =
      result.reason === "not_found" || result.reason === "no_access" ? 404
      : result.reason === "already_canceled" ? 409
      : 502;
    const message =
      result.reason === "not_found" ? "No tenés una suscripción activa."
      : result.reason === "no_access" ? "No hay un abono vigente para cancelar."
      : result.reason === "already_canceled" ? "La suscripción ya está cancelada."
      : "No se pudo cancelar la suscripción. Intentá de nuevo.";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({
    status: result.row.status,
    current_period_end: result.row.current_period_end,
    plan_code: result.row.plan_code,
    canceled_at: result.row.canceled_at ?? null,
  });
}
