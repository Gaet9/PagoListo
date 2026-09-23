import { jsPDF } from "jspdf";

import type { ComprobantePagoData } from "@/lib/mercadopago/comprobante-pago-types";
import {
    comprobantePagoPdfSafeFilename,
    formatComprobanteFechaAr,
    formatComprobanteMontoArs,
} from "@/lib/mercadopago/comprobante-pago-format";

export function buildComprobantePagoPdfDocument(data: ComprobantePagoData): jsPDF {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 18;
    let y = 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Comprobante de pago", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text("Mercado Pago · No es factura fiscal", margin, y);
    y += 12;
    doc.setTextColor(0, 0, 0);

    const rows: [string, string][] = [
        ["Negocio", data.negocioNombre],
        ["Fecha", formatComprobanteFechaAr(data.fechaIso)],
        ["Importe", formatComprobanteMontoArs(data.montoArs)],
        ["Referencia de pago", data.referenciaPago],
    ];

    doc.setFontSize(11);
    for (const [label, value] of rows) {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(value, 110);
        doc.text(wrapped, margin + 52, y);
        y += Math.max(7, wrapped.length * 5.2) + 2;
    }

    return doc;
}

export function downloadComprobantePagoPdf(data: ComprobantePagoData): void {
    const doc = buildComprobantePagoPdfDocument(data);
    doc.save(comprobantePagoPdfSafeFilename(data.referenciaPago));
}
