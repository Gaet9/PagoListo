import type { ComprobantePagoApiResponse } from "@/lib/mercadopago/comprobante-pago-types";

export type FetchComprobantePagoParams = {
    ventaId?: string | null;
    intentoId?: string | null;
    paymentId?: string | null;
};

export type FetchComprobantePagoResult =
    | { ok: true; comprobante: ComprobantePagoApiResponse }
    | { ok: false; message: string };

export function mercadoPagoComprobanteErrorMessage(status: number, bodyError?: string): string {
    if (status === 401) return "Sesión vencida. Volvé a entrar.";
    if (status === 403) return "No podés descargar este comprobante.";
    if (status === 404) return "Comprobante no disponible todavía.";
    if (status >= 500) return "No pudimos preparar el comprobante. Reintentá.";
    const trimmed = bodyError?.trim();
    if (trimmed) return trimmed.length > 120 ? "No pudimos preparar el comprobante." : trimmed;
    return "No pudimos preparar el comprobante.";
}

export async function fetchComprobantePago(
    params: FetchComprobantePagoParams,
): Promise<FetchComprobantePagoResult> {
    const qs = new URLSearchParams();
    if (params.ventaId?.trim()) qs.set("ventaId", params.ventaId.trim());
    if (params.intentoId?.trim()) qs.set("intentoId", params.intentoId.trim());
    if (params.paymentId?.trim()) qs.set("paymentId", params.paymentId.trim());

    const res = await fetch(`/api/mercadopago/comprobante?${qs.toString()}`, {
        method: "GET",
        credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as ComprobantePagoApiResponse & { error?: string };
    if (!res.ok) {
        return { ok: false, message: mercadoPagoComprobanteErrorMessage(res.status, data.error) };
    }
    return { ok: true, comprobante: data };
}
