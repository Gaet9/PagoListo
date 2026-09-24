import { NextResponse, type NextRequest } from "next/server";

import { enrichNegocioMiembrosWithUsuarios } from "@/lib/negocio/enrich-negocio-miembros";
import { isNegocioManagerRole, parseNegocioMembershipRole } from "@/lib/negocio/membership-role";
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
  const negocioId = request.nextUrl.searchParams.get("negocioId")?.trim() ?? "";
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

  const { data: membership, error: membershipErr } = await supabase
    .from("negocio_usuarios")
    .select("role")
    .eq("negocio_id", negocioId)
    .eq("usuario_id", user.id)
    .maybeSingle<{ role: string }>();

  if (membershipErr) {
    return NextResponse.json({ error: "No se pudo verificar permisos" }, { status: 500 });
  }

  const callerRole = parseNegocioMembershipRole(membership?.role);
  if (!isNegocioManagerRole(callerRole)) {
    return NextResponse.json({ error: "Sin permisos para ver el equipo de este negocio" }, { status: 403 });
  }

  const { data: rows, error: listErr } = await listNegocioMiembros(supabase, negocioId);
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const admin = createAdminClient();
  const { miembros, error: enrichErr } = await enrichNegocioMiembrosWithUsuarios(admin, rows ?? []);
  if (enrichErr) {
    console.error("[negocios/miembros] enrich usuarios", enrichErr);
    return NextResponse.json({ error: "No se pudo cargar perfiles del equipo" }, { status: 500 });
  }

  return NextResponse.json({ miembros });
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

  const { data: membership, error: membershipErr } = await supabase
    .from("negocio_usuarios")
    .select("role")
    .eq("negocio_id", negocioId)
    .eq("usuario_id", user.id)
    .maybeSingle<{ role: string }>();

  if (membershipErr) {
    return NextResponse.json({ error: "No se pudo verificar permisos" }, { status: 500 });
  }

  const callerRole = parseNegocioMembershipRole(membership?.role);
  if (!isNegocioManagerRole(callerRole)) {
    return NextResponse.json({ error: "Sin permisos para invitar en este negocio" }, { status: 403 });
  }

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
