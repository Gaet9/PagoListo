import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GAE-37 (UI) — contrato para desvincular MP por negocio.
 * Implementación segura (revoke en MP + borrado server-side de tokens): Rodrigo (GAE-8).
 */
export async function POST(request: NextRequest) {
    let json: unknown;
    try {
        json = await request.json();
    } catch {
        return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
    }

    const negocioId =
        json && typeof json === "object" && "negocioId" in json && typeof (json as { negocioId: unknown }).negocioId === "string" ?
            (json as { negocioId: string }).negocioId.trim()
        :   "";
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

    return NextResponse.json(
        {
            error: "Desvinculación en implementación (revoke seguro en servidor).",
            code: "not_implemented",
        },
        { status: 501 },
    );
}
