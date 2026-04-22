import { NextResponse, type NextRequest } from "next/server";

import { exchangeCodeForToken, getMercadoPagoOAuthPostConsentOrigin } from "@/lib/mercadopago/oauth";
import { createAdminClient } from "@/lib/supabase/admin";

function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

/** redirect_to se guarda como path relativo (p. ej. /tiendas/slug?tab=…); new URL(path) sin base falla. */
function resolveSafeRedirect(origin: string, redirectTo: string): URL {
    const base = new URL(origin);
    const trimmed = redirectTo.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return new URL("/tiendas", base);
    }
    const target = new URL(trimmed, base);
    if (target.origin !== base.origin) {
        return new URL("/tiendas", base);
    }
    return target;
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl;
    const postOrigin = getMercadoPagoOAuthPostConsentOrigin(url);
    const code = url.searchParams.get("code")?.trim();
    const state = url.searchParams.get("state")?.trim();

    if (!code) return badRequest("Falta code");
    if (!state) return badRequest("Falta state");

    const admin = createAdminClient();
    const { data: stateRow, error: stateErr } = await admin
        .from("mp_oauth_states")
        .select("state, negocio_id, requested_by, redirect_to, expires_at, code_verifier")
        .eq("state", state)
        .maybeSingle();
    if (stateErr || !stateRow) {
        return NextResponse.json({ error: "Estado inválido o expirado" }, { status: 400 });
    }

    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
        await admin.from("mp_oauth_states").delete().eq("state", state);
        return NextResponse.json({ error: "Estado expirado" }, { status: 400 });
    }

    try {
        const token = await exchangeCodeForToken({ code, codeVerifier: stateRow.code_verifier ?? null });
        const expiresAt =
            typeof token.expires_in === "number" && Number.isFinite(token.expires_in) ?
                new Date(Date.now() + token.expires_in * 1000).toISOString()
            :   null;

        const { error: upsertErr } = await admin.from("negocio_mercadopago_oauth").upsert(
            {
                negocio_id: stateRow.negocio_id,
                mp_user_id: typeof token.user_id === "number" ? token.user_id : null,
                access_token: token.access_token,
                refresh_token: token.refresh_token ?? null,
                expires_at: expiresAt,
                mp_public_key: token.public_key ?? null,
            },
            { onConflict: "negocio_id" },
        );
        if (upsertErr) {
            return NextResponse.json({ error: upsertErr.message }, { status: 500 });
        }

        await admin.from("mp_oauth_states").delete().eq("state", state);

        const redirectTo = stateRow.redirect_to?.trim();
        if (redirectTo) {
            return NextResponse.redirect(resolveSafeRedirect(postOrigin, redirectTo));
        }
        return NextResponse.redirect(new URL("/tiendas", postOrigin));
    } catch (e) {
        const message = e instanceof Error ? e.message : "OAuth error";
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
