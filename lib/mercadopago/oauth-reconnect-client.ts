import { clearMercadoPagoOAuthClientStorage } from "@/lib/mercadopago/oauth-client-storage";
import { buildMercadoPagoOAuthStartPath } from "@/lib/mercadopago/oauth-start-url";
import { unlinkMercadoPagoOAuth } from "@/lib/mercadopago/unlink-oauth-client";

export type BeginMercadoPagoConnectAnotherResult = { ok: true } | { ok: false; message: string };

/**
 * GAE-37: otra cuenta MP — desvincular en servidor (fail-closed), limpiar storage local, luego `reconnect=1`.
 * El authorize (`prompt=login`) lo aplica el servidor en oauth/start; no duplicar revoke ahí en el cliente.
 */
export async function beginMercadoPagoConnectAnotherAccount(
    negocioId: string,
    redirectTo: string,
): Promise<BeginMercadoPagoConnectAnotherResult> {
    const unlink = await unlinkMercadoPagoOAuth(negocioId);
    if (!unlink.ok) {
        return { ok: false, message: unlink.message };
    }

    clearMercadoPagoOAuthClientStorage();

    window.location.href = buildMercadoPagoOAuthStartPath(negocioId, redirectTo, { reconnect: true });
    return { ok: true };
}
