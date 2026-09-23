import { formatVentaDateTimeAr } from "@/lib/utils/format-venta-datetime-ar";

export function formatComprobanteMontoArs(monto: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(monto);
}

/** Misma presentación que la UI de Ventas para `created_at` de la venta. */
export function formatComprobanteFechaAr(iso: string): string {
    return formatVentaDateTimeAr(iso);
}

export function comprobantePagoPdfSafeFilename(referenciaPago: string): string {
    const safe = referenciaPago.replace(/[^\w.-]+/g, "_").slice(0, 48);
    return `comprobante-pago-${safe || "mp"}.pdf`;
}
