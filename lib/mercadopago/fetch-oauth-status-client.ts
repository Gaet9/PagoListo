import type { MercadoPagoOAuthStatusResponse } from "@/lib/types/mercadopago-oauth-status";

export type FetchMercadoPagoOAuthStatusResult =
    | { ok: true; status: MercadoPagoOAuthStatusResponse }
    | { ok: false; message: string };

/** Mensajes en español para respuestas de `GET /api/mercadopago/oauth/status` (sin tokens). */
export function mercadoPagoOAuthStatusErrorMessage(status: number, bodyError?: string): string {
    if (status === 401) {
        return "Tu sesión expiró. Volvé a iniciar sesión en PagoListo e intentá de nuevo.";
    }
    if (status === 404) {
        return "No encontramos esta tienda o no tenés permiso para verla.";
    }
    if (status >= 500) {
        return "No pudimos consultar Mercado Pago. Reintentá en unos segundos.";
    }
    const trimmed = bodyError?.trim();
    if (trimmed) return trimmed;
    return "No se pudo cargar el estado de Mercado Pago.";
}

export async function fetchMercadoPagoOAuthStatus(negocioId: string): Promise<FetchMercadoPagoOAuthStatusResult> {
    const res = await fetch(`/api/mercadopago/oauth/status?negocioId=${encodeURIComponent(negocioId)}`, {
        method: "GET",
        credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as MercadoPagoOAuthStatusResponse & { error?: string };
    if (!res.ok) {
        return { ok: false, message: mercadoPagoOAuthStatusErrorMessage(res.status, data.error) };
    }
    return { ok: true, status: data };
}
