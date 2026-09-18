export function formatComprobanteMontoArs(monto: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(monto);
}

export function formatComprobanteFechaAr(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleString("es-AR", {
        dateStyle: "long",
        timeStyle: "short",
    });
}

export function comprobantePagoPdfSafeFilename(referenciaPago: string): string {
    const safe = referenciaPago.replace(/[^\w.-]+/g, "_").slice(0, 48);
    return `comprobante-pago-${safe || "mp"}.pdf`;
}
