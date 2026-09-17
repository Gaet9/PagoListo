import { buildMercadoPagoOAuthStartPath } from "@/lib/mercadopago/oauth-start-url";
import { unlinkMercadoPagoOAuth } from "@/lib/mercadopago/unlink-oauth-client";

export type BeginMercadoPagoConnectAnotherResult = { ok: true } | { ok: false; message: string };

/**
 * GAE-37: desvincula en servidor y abre OAuth con `reconnect=1` para elegir otra cuenta MP.
 */
export async function beginMercadoPagoConnectAnotherAccount(
    negocioId: string,
    redirectTo: string,
): Promise<BeginMercadoPagoConnectAnotherResult> {
    const unlink = await unlinkMercadoPagoOAuth(negocioId);
    if (!unlink.ok) {
        return { ok: false, message: unlink.message };
    }
    window.location.href = buildMercadoPagoOAuthStartPath(negocioId, redirectTo, { reconnect: true });
    return { ok: true };
}
