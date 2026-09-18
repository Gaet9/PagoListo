"use client";

import { useMemo } from "react";

import { DescargarComprobantePagoButton } from "@/components/mercadopago/descargar-comprobante-pago-button";

function firstParam(v: string | string[] | undefined): string | null {
    if (v === undefined || v === "") return null;
    const raw = Array.isArray(v) ? v[0] : v;
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
}

type Props = {
    searchParams: Record<string, string | string[] | undefined>;
};

/**
 * Botón en la página de retorno de Checkout Pro (`/mercadopago/retorno/exito`).
 * Usa `external_reference` (intento) y `payment_id` de la URL para armar el comprobante.
 */
export function ComprobantePagoPdfButton({ searchParams }: Props) {
    const intentoId = useMemo(
        () => firstParam(searchParams.external_reference) ?? firstParam(searchParams.intento_id),
        [searchParams],
    );
    const paymentId = useMemo(
        () => firstParam(searchParams.payment_id) ?? firstParam(searchParams.collection_id),
        [searchParams],
    );
    const status = useMemo(() => firstParam(searchParams.status) ?? firstParam(searchParams.collection_status), [searchParams]);

    if (!intentoId && !paymentId) {
        return null;
    }

    if (status && status !== "approved" && status !== "success") {
        return null;
    }

    return (
        <DescargarComprobantePagoButton
            intentoId={intentoId}
            paymentId={paymentId}
            variant="secondary"
            size="default"
        />
    );
}
