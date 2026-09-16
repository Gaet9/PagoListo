import { NextResponse, type NextRequest } from "next/server";

import { refreshMercadoPagoAccessToken } from "@/lib/mercadopago/oauth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

type MercadoPagoUserMe = {
    id?: number;
    nickname?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
};

function buildAccountLabel(me: MercadoPagoUserMe): string | null {
    const email = typeof me.email === "string" && me.email.trim() ? me.email.trim() : "";
    if (email) return email;

    const nick = typeof me.nickname === "string" && me.nickname.trim() ? me.nickname.trim() : "";
    if (nick) return nick;

    const fn = typeof me.first_name === "string" ? me.first_name.trim() : "";
    const ln = typeof me.last_name === "string" ? me.last_name.trim() : "";
    const full = `${fn} ${ln}`.trim();
    if (full) return full;

    return null;
}

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const negocioId = url.searchParams.get("negocioId")?.trim();
    if (!negocioId) return badRequest("Falta negocioId");

    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validar acceso por RLS (no devolvemos tokens nunca al cliente).
    const { data: negocio, error: negocioErr } = await supabase.from("negocios").select("id").eq("id", negocioId).single();
    if (negocioErr || !negocio) {
        return NextResponse.json({ error: "Negocio no encontrado o sin permisos" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: row, error } = await admin
        .from("negocio_mercadopago_oauth")
        .select("negocio_id, mp_user_id, access_token, refresh_token, expires_at, updated_at")
        .eq("negocio_id", negocioId)
        .maybeSingle();
    if (error) {
        console.error("[mp-oauth/status] read failed", error.message);
        return NextResponse.json({ error: "No se pudo consultar el estado de Mercado Pago." }, { status: 500 });
    }

    if (!row) {
        return NextResponse.json({
            connected: false,
            mp_user_id: null,
            account_label: null,
            account_email: null,
            account_nickname: null,
            expires_at: null,
            updated_at: null,
        });
    }

    let accessToken = row.access_token;
    let expiresAt = row.expires_at ?? null;
    const refreshToken = row.refresh_token ?? null;

    const expMs = expiresAt ? new Date(expiresAt).getTime() : null;
    const shouldRefresh =
        typeof refreshToken === "string" &&
        refreshToken.trim().length > 0 &&
        (expMs === null || !Number.isFinite(expMs) || expMs < Date.now() + 60_000);

    if (shouldRefresh) {
        try {
            const token = await refreshMercadoPagoAccessToken({ refresh_token: refreshToken });
            accessToken = token.access_token;
            expiresAt =
                typeof token.expires_in === "number" && Number.isFinite(token.expires_in) ?
                    new Date(Date.now() + token.expires_in * 1000).toISOString()
                :   expiresAt;

            await admin.from("negocio_mercadopago_oauth").upsert(
                {
                    negocio_id: negocioId,
                    mp_user_id: typeof token.user_id === "number" ? token.user_id : row.mp_user_id,
                    access_token: token.access_token,
                    refresh_token: token.refresh_token ?? refreshToken,
                    expires_at: expiresAt,
                    mp_public_key: token.public_key ?? null,
                },
                { onConflict: "negocio_id" },
            );
        } catch {
            // Si el refresh falla, intentamos users/me con el access_token vigente (puede estar expirado).
        }
    }

    let accountEmail: string | null = null;
    let accountNickname: string | null = null;
    let accountLabel: string | null = null;

    try {
        const res = await fetch("https://api.mercadopago.com/users/me", {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const me = (await res.json().catch(() => null)) as MercadoPagoUserMe | { message?: string } | null;
        if (res.ok && me && typeof me === "object" && !("message" in me)) {
            const u = me as MercadoPagoUserMe;
            accountEmail = typeof u.email === "string" && u.email.trim() ? u.email.trim() : null;
            accountNickname = typeof u.nickname === "string" && u.nickname.trim() ? u.nickname.trim() : null;
            accountLabel = buildAccountLabel(u);
        }
    } catch {
        // best-effort
    }

    return NextResponse.json({
        connected: true,
        mp_user_id: row.mp_user_id ?? null,
        account_label: accountLabel,
        account_email: accountEmail,
        account_nickname: accountNickname,
        expires_at: expiresAt,
        updated_at: row.updated_at ?? null,
    });
}
