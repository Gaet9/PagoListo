import { MERCADOPAGO_OAUTH_UNLINK_API_PATH } from "@/lib/mercadopago/oauth-unlink-endpoint";

export type UnlinkMercadoPagoOAuthResult = { ok: true } | { ok: false; message: string; notImplemented?: boolean };

export async function unlinkMercadoPagoOAuth(negocioId: string): Promise<UnlinkMercadoPagoOAuthResult> {
    const res = await fetch(MERCADOPAGO_OAUTH_UNLINK_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ negocioId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (res.status === 404 || res.status === 501 || data.code === "not_implemented") {
        return {
            ok: false,
            notImplemented: true,
            message:
                "Todavía no está habilitada la desvinculación en el servidor. Probá «Desvincular» de nuevo más tarde.",
        };
    }
    if (!res.ok) {
        if (res.status === 401) {
            return { ok: false, message: "Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo." };
        }
        const trimmed = data.error?.trim();
        return { ok: false, message: trimmed || "No se pudo desvincular Mercado Pago." };
    }
    return { ok: true };
}
