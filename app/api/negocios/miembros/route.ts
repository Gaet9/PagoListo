import { NextResponse, type NextRequest } from "next/server";

import { parseNegocioMembershipRole } from "@/lib/negocio/membership-role";
import { denyUnlessNegocioManager } from "@/lib/auth/negocio-manager-api";
import { insertNegocioMiembro, listNegocioMiembros } from "@/lib/queries/negocio-usuarios";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type InviteBody = {
  negocioId?: string;
  email?: string;
  role?: string;
};

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  const negocioId = new URL(request.url).searchParams.get("negocioId")?.trim() ?? "";
  if (!negocioId) {
    return NextResponse.json({ error: "Falta negocioId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const denied = await denyUnlessNegocioManager(supabase, negocioId);
  if (denied) return denied;

  const admin = createAdminClient();
  const { data: miembros, error: listErr } = await listNegocioMiembros(admin, negocioId);
  if (listErr) {
    console.error("[negocios/miembros] list", listErr.message);
    return NextResponse.json({ error: "No se pudo cargar el equipo" }, { status: 500 });
  }

  return NextResponse.json({ miembros: miembros ?? [] });
}

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const body = (json ?? {}) as InviteBody;
  const negocioId = typeof body.negocioId === "string" ? body.negocioId.trim() : "";
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const inviteRole = parseNegocioMembershipRole(body.role) ?? "employee";

  if (!negocioId) {
    return NextResponse.json({ error: "Falta negocioId" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  if (inviteRole !== "employee") {
    return NextResponse.json({ error: "Solo se puede asignar rol empleado en esta versión" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const denied = await denyUnlessNegocioManager(supabase, negocioId);
  if (denied) return denied;

  const admin = createAdminClient();
  const { data: targetUser, error: lookupErr } = await admin
    .from("usuarios")
    .select("id, email")
    .eq("email", email)
    .maybeSingle<{ id: string; email: string }>();

  if (lookupErr) {
    console.error("[negocios/miembros] lookup usuario", lookupErr.message);
    return NextResponse.json({ error: "No se pudo buscar el usuario" }, { status: 500 });
  }
  if (!targetUser) {
    return NextResponse.json(
      { error: "No hay cuenta con ese correo. La persona debe registrarse primero." },
      { status: 404 },
    );
  }

  if (targetUser.id === user.id) {
    return NextResponse.json({ error: "No podés agregarte a vos mismo" }, { status: 400 });
  }

  const { error: insertErr } = await insertNegocioMiembro(supabase, {
    negocio_id: negocioId,
    usuario_id: targetUser.id,
    role: "employee",
  });

  if (insertErr) {
    const code = insertErr.code ?? "";
    if (code === "23505") {
      return NextResponse.json({ error: "Esa persona ya es miembro del negocio" }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    usuario_id: targetUser.id,
    email: targetUser.email,
    role: "employee",
  });
}
