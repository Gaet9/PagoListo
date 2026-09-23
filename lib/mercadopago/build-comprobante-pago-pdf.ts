import { jsPDF } from "jspdf";

import type { ComprobantePagoData } from "@/lib/mercadopago/comprobante-pago-types";
import {
    comprobantePagoPdfSafeFilename,
    formatComprobanteMontoArs,
} from "@/lib/mercadopago/comprobante-pago-format";

export function comprobantePagoPdfRows(data: ComprobantePagoData): [string, string][] {
    return [
        ["Negocio", data.negocioNombre],
        ["Fecha", data.fechaDisplay],
        ["Importe", formatComprobanteMontoArs(data.montoArs)],
        ["Referencia de pago", data.referenciaPago],
    ];
}

function lineHeightMm(doc: jsPDF, fontSizePt: number): number {
    return (fontSizePt * doc.getLineHeightFactor()) / doc.internal.scaleFactor;
}

export function buildComprobantePagoPdfDocument(data: ComprobantePagoData): jsPDF {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const contentW = pageW - margin * 2;
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

    const rows = comprobantePagoPdfRows(data);
    const labelSize = 10;
    const valueSize = 11;

    for (const [label, value] of rows) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(labelSize);
        doc.text(label, margin, y);
        y += lineHeightMm(doc, labelSize) + 1;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(valueSize);
        const wrapped = doc.splitTextToSize(value, contentW);
        doc.text(wrapped, margin, y);
        y += wrapped.length * lineHeightMm(doc, valueSize) + 5;
    }

    return doc;
}

export function downloadComprobantePagoPdf(data: ComprobantePagoData): void {
    const doc = buildComprobantePagoPdfDocument(data);
    doc.save(comprobantePagoPdfSafeFilename(data.referenciaPago));
}
