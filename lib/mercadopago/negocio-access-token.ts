import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { refreshMercadoPagoAccessToken } from "@/lib/mercadopago/oauth";

type OAuthRow = {
  negocio_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  mp_user_id: number | null;
};

/** Obtiene un access_token vigente del negocio (refresca si hace falta). Solo server/service_role. */
export async function getMercadoPagoAccessTokenForNegocio(
  admin: SupabaseClient,
  negocioId: string,
): Promise<string | null> {
  const { data: row, error } = await admin
    .from("negocio_mercadopago_oauth")
    .select("negocio_id, access_token, refresh_token, expires_at, mp_user_id")
    .eq("negocio_id", negocioId)
    .maybeSingle();
  if (error || !row?.access_token) return null;

  const oauthRow = row as OAuthRow;
  let accessToken = oauthRow.access_token;
  const refreshToken = oauthRow.refresh_token ?? null;
  const expiresAt = oauthRow.expires_at ?? null;
  const expMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const shouldRefresh =
    typeof refreshToken === "string" &&
    refreshToken.trim().length > 0 &&
    (expMs === null || !Number.isFinite(expMs) || expMs < Date.now() + 60_000);

  if (!shouldRefresh) return accessToken;

  try {
    const token = await refreshMercadoPagoAccessToken({ refresh_token: refreshToken });
    accessToken = token.access_token;
    const newExpiresAt =
      typeof token.expires_in === "number" && Number.isFinite(token.expires_in) ?
        new Date(Date.now() + token.expires_in * 1000).toISOString()
      :   expiresAt;

    await admin.from("negocio_mercadopago_oauth").upsert(
      {
        negocio_id: negocioId,
        mp_user_id: typeof token.user_id === "number" ? token.user_id : oauthRow.mp_user_id,
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? refreshToken,
        expires_at: newExpiresAt,
        mp_public_key: token.public_key ?? null,
      },
      { onConflict: "negocio_id" },
    );
    return accessToken;
  } catch {
    return accessToken;
  }
}
