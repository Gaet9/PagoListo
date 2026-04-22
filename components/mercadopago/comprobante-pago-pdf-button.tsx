"use client";

import { jsPDF } from "jspdf";
import { FileDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const LABELS_ES: Record<string, string> = {
  collection_id: "ID de cobro (collection)",
  collection_status: "Estado del cobro",
  payment_id: "ID del pago",
  status: "Estado del pago",
  external_reference: "Referencia externa",
  payment_type: "Tipo de pago",
  merchant_order_id: "ID orden (merchant order)",
  preference_id: "ID de preferencia",
  site_id: "Sitio (MLA, etc.)",
  processing_mode: "Modo de procesamiento",
  merchant_account_id: "Cuenta merchant",
};

function normalizeParams(raw: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === "") continue;
    out[k] = Array.isArray(v) ? v.join(", ") : v;
  }
  return out;
}

function buildPdf(params: Record<string, string>) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const maxW = pageW - margin * 2;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Comprobante de pago — Mercado Pago", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, margin, y);
  y += 10;
  doc.setTextColor(0, 0, 0);

  const keys = Object.keys(params).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const label = LABELS_ES[key] ?? key;
    const value = params[key] ?? "";
    const wrapped = doc.splitTextToSize(`${label}: ${value}`, maxW);
    const blockH = wrapped.length * 4.8 + 3;

    if (y + blockH > pageH - 14) {
      doc.addPage();
      y = 18;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(wrapped, margin, y);
    y += blockH;
  }

  const pid = params.payment_id || params.preference_id || "pago";
  const safe = pid.replace(/[^\w.-]+/g, "_").slice(0, 48);
  doc.save(`comprobante-pago-${safe}.pdf`);
}

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export function ComprobantePagoPdfButton({ searchParams }: Props) {
  const [busy, setBusy] = useState(false);
  const params = normalizeParams(searchParams);
  const hasData = Object.keys(params).length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="gap-2"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        try {
          buildPdf(params);
        } finally {
          setBusy(false);
        }
      }}
    >
      <FileDown className="h-4 w-4 shrink-0" aria-hidden />
      {busy ? "Generando…" : "Imprimir / descargar PDF"}
    </Button>
  );
}
