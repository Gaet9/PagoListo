"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { downloadComprobantePagoPdfFromApi } from "@/lib/mercadopago/build-comprobante-pago-pdf";
import { ComprobanteSinFechaError } from "@/lib/mercadopago/comprobante-pago-types";
import { fetchComprobantePago } from "@/lib/mercadopago/fetch-comprobante-pago-client";
import { Button } from "@/components/ui/button";

type Props = {
    ventaId?: string | null;
    intentoId?: string | null;
    paymentId?: string | null;
    size?: "default" | "sm" | "lg" | "icon";
    variant?: "default" | "secondary" | "outline" | "ghost";
    className?: string;
};

export function DescargarComprobantePagoButton({
    ventaId,
    intentoId,
    paymentId,
    size = "sm",
    variant = "secondary",
    className,
}: Props) {
    const [busy, setBusy] = useState(false);

    const canDownload = Boolean(ventaId?.trim() || intentoId?.trim());
    if (!canDownload) {
        return null;
    }

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={className ?? "gap-2"}
            disabled={busy}
            onClick={() => {
                void (async () => {
                    setBusy(true);
                    try {
                        const result = await fetchComprobantePago({ ventaId, intentoId, paymentId });
                        if (!result.ok) {
                            toast.error(result.message);
                            return;
                        }
                        try {
                            downloadComprobantePagoPdfFromApi(result.comprobante);
                        } catch (err) {
                            if (err instanceof ComprobanteSinFechaError) {
                                toast.error("Falta la fecha del cobro en el comprobante. Reintentá en unos segundos.");
                                return;
                            }
                            throw err;
                        }
                    } finally {
                        setBusy(false);
                    }
                })();
            }}
        >
            <FileDown className="h-4 w-4 shrink-0" aria-hidden />
            {busy ? "Generando…" : "Descargar comprobante PDF"}
        </Button>
    );
}
