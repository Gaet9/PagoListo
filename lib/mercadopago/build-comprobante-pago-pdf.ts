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

    if (data.ventaId) {
        rows.push(["Venta", data.ventaId]);
    }

    doc.setFontSize(11);
    for (const [label, value] of rows) {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(value, 110);
        doc.text(wrapped, margin + 52, y);
        y += Math.max(7, wrapped.length * 5.2) + 2;
    }

    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
        `Documento generado por PagoListo el ${new Date().toLocaleString("es-AR")}.`,
        margin,
        y,
    );

    return doc;
}

export function downloadComprobantePagoPdf(data: ComprobantePagoData): void {
    const doc = buildComprobantePagoPdfDocument(data);
    doc.save(comprobantePagoPdfSafeFilename(data.referenciaPago));
}
