import { clearMercadoPagoOAuthClientStorage } from "@/lib/mercadopago/oauth-client-storage";
import { unlinkMercadoPagoOAuth } from "@/lib/mercadopago/unlink-oauth-client";

export type BeginMercadoPagoConnectAnotherResult = { ok: true } | { ok: false; message: string };

/**
 * GAE-37 / hotfix prod: otra cuenta MP — solo desvincular en servidor (fail-closed) y limpiar storage local.
 * El usuario vuelve a la UI «Desvinculada» y toca «Conectar con Mercado Pago» (oauth/start **sin** `reconnect=1`).
 * MP no documenta logout de navegador; `prompt=login` es best-effort e insuficiente en un solo paso.
 */
export async function beginMercadoPagoConnectAnotherAccount(negocioId: string): Promise<BeginMercadoPagoConnectAnotherResult> {
    const unlink = await unlinkMercadoPagoOAuth(negocioId, { strictRevoke: true });
    if (!unlink.ok) {
        return { ok: false, message: unlink.message };
    }

    clearMercadoPagoOAuthClientStorage();

    return { ok: true };
}
