export function formatComprobanteMontoArs(monto: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(monto);
}

const COMPROBANTE_FECHA_TZ = "America/Argentina/Buenos_Aires";

/** Fecha/hora del cobro en español AR (zona Buenos Aires). */
export function formatComprobanteFechaAr(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleString("es-AR", {
        timeZone: COMPROBANTE_FECHA_TZ,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export function comprobantePagoPdfSafeFilename(referenciaPago: string): string {
    const safe = referenciaPago.replace(/[^\w.-]+/g, "_").slice(0, 48);
    return `comprobante-pago-${safe || "mp"}.pdf`;
}
