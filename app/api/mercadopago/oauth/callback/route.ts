import { NextResponse, type NextRequest } from "next/server";

import { buildOAuthCallbackErrorRedirect, buildOAuthCallbackRedirect } from "@/lib/mercadopago/oauth-callback-redirect";
import { exchangeCodeForToken, getMercadoPagoOAuthPostConsentOrigin } from "@/lib/mercadopago/oauth";
import { createAdminClient } from "@/lib/supabase/admin";

function redirectWithError(
    postOrigin: string,
    redirectTo: string | null | undefined,
    code: "estado_invalido" | "estado_expirado" | "intercambio_fallido" | "guardado_fallido" | "cancelado" | "falta_autorizacion",
) {
    const target = buildOAuthCallbackErrorRedirect(postOrigin, redirectTo, code);
    return NextResponse.redirect(target);
}

async function loadStateRow(state: string) {
    const admin = createAdminClient();
    return admin
        .from("mp_oauth_states")
        .select("state, negocio_id, requested_by, redirect_to, expires_at, code_verifier")
        .eq("state", state)
        .maybeSingle();
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl;
    const postOrigin = getMercadoPagoOAuthPostConsentOrigin(url);
    const code = url.searchParams.get("code")?.trim();
    const state = url.searchParams.get("state")?.trim();
    const mpError = url.searchParams.get("error")?.trim();

    if (mpError && !code) {
        let redirectTo: string | null = null;
        if (state) {
            const { data: stateRow } = await loadStateRow(state);
            redirectTo = stateRow?.redirect_to ?? null;
            if (stateRow?.state) {
                const admin = createAdminClient();
                await admin.from("mp_oauth_states").delete().eq("state", state);
            }
        }
        const errCode = mpError === "access_denied" ? "cancelado" : "falta_autorizacion";
        return redirectWithError(postOrigin, redirectTo, errCode);
    }

    if (!code) {
        return redirectWithError(postOrigin, null, "falta_autorizacion");
    }
    if (!state) {
        return redirectWithError(postOrigin, null, "estado_invalido");
    }

    const admin = createAdminClient();
    const { data: stateRow, error: stateErr } = await admin
        .from("mp_oauth_states")
        .select("state, negocio_id, requested_by, redirect_to, expires_at, code_verifier")
        .eq("state", state)
        .maybeSingle();
    if (stateErr || !stateRow) {
        return redirectWithError(postOrigin, null, "estado_invalido");
    }

    const redirectTo = stateRow.redirect_to;

    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
        await admin.from("mp_oauth_states").delete().eq("state", state);
        return redirectWithError(postOrigin, redirectTo, "estado_expirado");
    }

    const codeVerifier = stateRow.code_verifier?.trim();
    if (!codeVerifier) {
        await admin.from("mp_oauth_states").delete().eq("state", state);
        return redirectWithError(postOrigin, redirectTo, "estado_invalido");
    }

    try {
        const token = await exchangeCodeForToken({ code, codeVerifier });
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
            console.error("[mp-oauth/callback] negocio_mercadopago_oauth upsert failed", upsertErr.message);
            return redirectWithError(postOrigin, redirectTo, "guardado_fallido");
        }

        await admin.from("mp_oauth_states").delete().eq("state", state);

        const successTarget = buildOAuthCallbackRedirect(postOrigin, redirectTo, { kind: "ok" });
        return NextResponse.redirect(successTarget);
    } catch {
        return redirectWithError(postOrigin, redirectTo, "intercambio_fallido");
    }
}
