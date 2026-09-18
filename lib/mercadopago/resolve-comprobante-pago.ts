import type { SupabaseClient } from "@supabase/supabase-js";

import type { ComprobantePagoApiResponse } from "@/lib/mercadopago/comprobante-pago-types";
import { resolveReferenciaPagoMercadoPago } from "@/lib/mercadopago/comprobante-pago-referencia";

type VentaMercadoPagoNested = {
    mp_payment_id: string | null;
    mp_preference_id: string | null;
} | null;

type VentaComprobanteRow = {
    id: string;
    total: string | number | null;
    created_at: string;
    negocios: { nombre: string } | { nombre: string }[] | null;
    venta_mercadopago: VentaMercadoPagoNested | VentaMercadoPagoNested[];
};

function pickNegocioNombre(
    negocios: VentaComprobanteRow["negocios"],
): string | null {
    if (!negocios) return null;
    if (Array.isArray(negocios)) {
        return negocios[0]?.nombre?.trim() || null;
    }
    return negocios.nombre?.trim() || null;
}

function pickVentaMp(
    row: VentaComprobanteRow["venta_mercadopago"],
): VentaMercadoPagoNested {
    if (!row) return null;
    if (Array.isArray(row)) return row[0] ?? null;
    return row;
}

function toNumber(v: string | number | null | undefined): number {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

export async function resolveComprobantePagoForVenta(
    supabase: SupabaseClient,
    ventaId: string,
    opts?: { paymentIdFallback?: string | null },
): Promise<{ data: ComprobantePagoApiResponse | null; error: string | null; status: number }> {
    const { data, error } = await supabase
        .from("ventas")
        .select(
            "id, total, created_at, negocios ( nombre ), venta_mercadopago ( mp_payment_id, mp_preference_id )",
        )
        .eq("id", ventaId)
        .maybeSingle();

    if (error) {
        return { data: null, error: error.message, status: 500 };
    }
    if (!data) {
        return { data: null, error: "Venta no encontrada", status: 404 };
    }

    const row = data as VentaComprobanteRow;
    const negocioNombre = pickNegocioNombre(row.negocios);
    if (!negocioNombre) {
        return { data: null, error: "Negocio no encontrado", status: 404 };
    }

    const mp = pickVentaMp(row.venta_mercadopago);
    const monto = toNumber(row.total);
    const referencia = resolveReferenciaPagoMercadoPago(mp, opts?.paymentIdFallback ?? null);
    if (!referencia) {
        return {
            data: null,
            error: "Referencia de pago aún no disponible. Reintentá en unos segundos.",
            status: 404,
        };
    }

    return {
        data: {
            negocio_nombre: negocioNombre,
            monto_ars: monto,
            referencia_pago: referencia,
        },
        error: null,
        status: 200,
    };
}

type IntentoRow = {
    id: string;
    negocio_id: string;
    usuario_id: string;
    venta_id: string | null;
    created_at: string;
    expected_total_ars: string | number | null;
};

export async function resolveComprobantePagoForIntento(
    supabase: SupabaseClient,
    admin: SupabaseClient,
    userId: string,
    intentoId: string,
    paymentIdFallback: string | null,
): Promise<{ data: ComprobantePagoApiResponse | null; error: string | null; status: number }> {
    const { data: intento, error: intentoErr } = await admin
        .from("mp_cobro_intentos")
        .select("id, negocio_id, usuario_id, venta_id, created_at, expected_total_ars")
        .eq("id", intentoId)
        .maybeSingle();

    if (intentoErr) {
        return { data: null, error: intentoErr.message, status: 500 };
    }
    if (!intento) {
        return { data: null, error: "Cobro no encontrado", status: 404 };
    }

    const row = intento as IntentoRow;
    if (row.usuario_id !== userId) {
        return { data: null, error: "No podés descargar este comprobante.", status: 403 };
    }

    if (row.venta_id) {
        return resolveComprobantePagoForVenta(supabase, row.venta_id, {
            paymentIdFallback,
        });
    }

    const { data: negocio, error: negocioErr } = await supabase
        .from("negocios")
        .select("nombre")
        .eq("id", row.negocio_id)
        .maybeSingle();

    if (negocioErr) {
        return { data: null, error: negocioErr.message, status: 500 };
    }
    const negocioNombre = (negocio as { nombre?: string } | null)?.nombre?.trim();
    if (!negocioNombre) {
        return { data: null, error: "Negocio no encontrado", status: 404 };
    }

    const referencia = resolveReferenciaPagoMercadoPago(null, paymentIdFallback);
    if (!referencia) {
        return {
            data: null,
            error: "Referencia de pago aún no disponible. Reintentá en unos segundos.",
            status: 404,
        };
    }

    return {
        data: {
            negocio_nombre: negocioNombre,
            monto_ars: toNumber(row.expected_total_ars),
            referencia_pago: referencia,
        },
        error: null,
        status: 200,
    };
}
