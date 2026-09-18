import {
    mercadoPagoCobroPreferenceErrorMessage,
    mercadoPagoCobroPreferenceUnknownErrorMessage,
} from "@/lib/mercadopago/cobro-preference-error-client";

export type CobroPreferenceLine = {
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: "ARS";
};

export type CreateCobroPreferenceResult =
    | { ok: true; initPoint: string; intentoId: string }
    | { ok: false; message: string };

export async function createCobroPreferenceClient(
    negocioId: string,
    items: CobroPreferenceLine[],
): Promise<CreateCobroPreferenceResult> {
    try {
        const res = await fetch("/api/mercadopago/preference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ negocioId, items }),
        });
        const data = (await res.json().catch(() => ({}))) as {
            init_point?: string;
            sandbox_init_point?: string;
            intento_id?: string;
            error?: string;
        };
        if (!res.ok) {
            return { ok: false, message: mercadoPagoCobroPreferenceErrorMessage(res.status, data.error) };
        }
        const initPoint = data.init_point || data.sandbox_init_point;
        if (!initPoint) {
            return { ok: false, message: mercadoPagoCobroPreferenceErrorMessage(502, data.error) };
        }
        const intentoId = typeof data.intento_id === "string" ? data.intento_id : "";
        if (!intentoId) {
            return { ok: false, message: "No pudimos iniciar el cobro. Reintentá." };
        }
        return { ok: true, initPoint, intentoId };
    } catch (e) {
        return { ok: false, message: mercadoPagoCobroPreferenceUnknownErrorMessage(e) };
    }
}
