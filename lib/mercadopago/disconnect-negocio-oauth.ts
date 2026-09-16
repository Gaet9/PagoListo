import "server-only";

import { getMercadoPagoOAuthClientId } from "@/lib/mercadopago/oauth";
import { revokeMercadoPagoAuthorizationBestEffort as revokeMpBestEffort } from "@/lib/mercadopago/oauth-revoke-best-effort";
import { createAdminClient } from "@/lib/supabase/admin";

export type DisconnectNegocioMercadoPagoResult =
  | { ok: true; wasConnected: boolean; mpRevokeAttempted: boolean; mpRevokeOk: boolean }
  | { ok: false; reason: "delete_failed" };

/** Server-only: remove stored OAuth credentials and pending OAuth states for a negocio. */
export async function disconnectNegocioMercadoPagoOAuth(negocioId: string): Promise<DisconnectNegocioMercadoPagoResult> {
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
  if (typeof row.access_token === "string" && row.access_token.trim().length > 0) {
    mpRevokeAttempted = true;
    mpRevokeOk = await revokeMpBestEffort({
      accessToken: row.access_token,
      mpUserId: typeof row.mp_user_id === "number" ? row.mp_user_id : null,
      clientId: getMercadoPagoOAuthClientId(),
    });
    if (!mpRevokeOk) {
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
