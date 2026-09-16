import { NextResponse } from "next/server";

import { sendTransactionalEmail } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";

/** Envío de prueba Resend: solo en desarrollo y con sesión autenticada. */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let to = user.email ?? "";
  try {
    const body = (await request.json()) as { to?: string };
    if (body.to?.trim()) {
      to = body.to.trim();
    }
  } catch {
    // cuerpo opcional
  }

  if (!to) {
    return NextResponse.json(
      { error: "Indicá un destinatario o usá una cuenta con email." },
      { status: 400 }
    );
  }

  try {
    const result = await sendTransactionalEmail({
      to,
      subject: "PagoListo — prueba Resend",
      text: "Si recibís este mensaje, Resend está configurado correctamente.",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }

    return NextResponse.json({ id: result.id, to });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo enviar el correo de prueba.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
