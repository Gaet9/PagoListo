import "server-only";

import { getMercadoPagoOAuthClientId } from "@/lib/mercadopago/oauth";
import { reconnectDisconnectBlockedByMpRevoke } from "@/lib/mercadopago/oauth-reconnect";
import { revokeMercadoPagoAuthorizationBestEffort as revokeMpBestEffort } from "@/lib/mercadopago/oauth-revoke-best-effort";
import { createAdminClient } from "@/lib/supabase/admin";

export type DisconnectNegocioMercadoPagoOptions = {
  /**
   * Reconnect (`reconnect=1`): si había `access_token` guardado, exige revocación MP exitosa
   * antes de borrar filas locales. Si falla, no se borra la vinculación (fail closed).
   */
  failClosedWhenStoredTokensExist?: boolean;
};

export type DisconnectNegocioMercadoPagoResult =
  | { ok: true; wasConnected: boolean; mpRevokeAttempted: boolean; mpRevokeOk: boolean }
  | { ok: false; reason: "delete_failed" | "mp_revoke_failed" };

/** Server-only: remove stored OAuth credentials and pending OAuth states for a negocio. */
export async function disconnectNegocioMercadoPagoOAuth(
  negocioId: string,
  options?: DisconnectNegocioMercadoPagoOptions,
): Promise<DisconnectNegocioMercadoPagoResult> {
  const failClosed = options?.failClosedWhenStoredTokensExist === true;
  const admin = createAdminClient();

  const { data: row, error: readErr } = await admin
    .from("negocio_mercadopago_oauth")
    .select("negocio_id, access_token, mp_user_id")
    .eq("negocio_id", negocioId)
    .maybeSingle();

  if (readErr) {
    console.error("[mp-oauth/disconnect] read failed", readErr.message);
    return { ok: false, reason: "delete_failed" };
  }

  if (!row) {
    await admin.from("mp_oauth_states").delete().eq("negocio_id", negocioId);
    return { ok: true, wasConnected: false, mpRevokeAttempted: false, mpRevokeOk: false };
  }

  let mpRevokeAttempted = false;
  let mpRevokeOk = false;
  const storedAccessToken = row.access_token;

  if (typeof storedAccessToken === "string" && storedAccessToken.trim().length > 0) {
    mpRevokeAttempted = true;
    mpRevokeOk = await revokeMpBestEffort({
      accessToken: storedAccessToken,
      mpUserId: typeof row.mp_user_id === "number" ? row.mp_user_id : null,
      clientId: getMercadoPagoOAuthClientId(),
    });
    if (reconnectDisconnectBlockedByMpRevoke({ storedAccessToken, mpRevokeAttempted, mpRevokeOk })) {
      if (failClosed) {
        console.error("[mp-oauth/disconnect] reconnect fail-closed: MP revoke did not succeed", negocioId);
        return { ok: false, reason: "mp_revoke_failed" };
      }
      console.warn("[mp-oauth/disconnect] MP deauthorize best-effort did not succeed; clearing local tokens anyway");
    }
  }

  const { error: delErr } = await admin.from("negocio_mercadopago_oauth").delete().eq("negocio_id", negocioId);
  if (delErr) {
    console.error("[mp-oauth/disconnect] delete failed", delErr.message);
    return { ok: false, reason: "delete_failed" };
  }

  await admin.from("mp_oauth_states").delete().eq("negocio_id", negocioId);

  return { ok: true, wasConnected: true, mpRevokeAttempted, mpRevokeOk };
}
