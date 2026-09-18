export type CobroIntentoStatusResponse = {
    intento_id: string;
    venta_id: string | null;
    approved: boolean;
    consumed_at: string | null;
    created_at: string;
};

export type FetchCobroIntentoStatusResult =
    | { ok: true; status: CobroIntentoStatusResponse }
    | { ok: false; message: string };

/** Mensajes cortos para consultar estado del intento (poll / botón manual). */
export function mercadoPagoCobroIntentoStatusErrorMessage(status: number, bodyError?: string): string {
    if (status === 401) return "Sesión vencida. Volvé a entrar.";
    if (status === 403) return "No podés consultar este cobro.";
    if (status === 404) return "Cobro no encontrado.";
    if (status >= 500) return "No pudimos consultar el pago. Reintentá.";
    const trimmed = bodyError?.trim();
    if (trimmed) return trimmed.length > 100 ? "No pudimos consultar el pago." : trimmed;
    return "No pudimos consultar el pago.";
}

export async function fetchCobroIntentoStatus(intentoId: string): Promise<FetchCobroIntentoStatusResult> {
    const res = await fetch(`/api/mercadopago/cobro-intento/status?intentoId=${encodeURIComponent(intentoId)}`, {
        method: "GET",
        credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as CobroIntentoStatusResponse & { error?: string };
    if (!res.ok) {
        return { ok: false, message: mercadoPagoCobroIntentoStatusErrorMessage(res.status, data.error) };
    }
    return { ok: true, status: data };
}
