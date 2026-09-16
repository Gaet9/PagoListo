export type UnlinkMercadoPagoOAuthResult = { ok: true } | { ok: false; message: string; notImplemented?: boolean };

/** Contrato para Rodrigo (GAE-8): `POST /api/mercadopago/oauth/unlink` con `{ negocioId }`. */
export async function unlinkMercadoPagoOAuth(negocioId: string): Promise<UnlinkMercadoPagoOAuthResult> {
    const res = await fetch("/api/mercadopago/oauth/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ negocioId }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (res.status === 501 || data.code === "not_implemented") {
        return {
            ok: false,
            notImplemented: true,
            message:
                "Todavía no está disponible desvincular desde la app. Rodrigo está habilitando el endpoint seguro; probá de nuevo en unos minutos o usá «Cambiar cuenta» para vincular otra cuenta de Mercado Pago.",
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
