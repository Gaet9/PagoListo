"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const MercadoPagoWalletCheckout = dynamic(
  () => import("@/components/tienda/mercadopago-wallet-checkout").then((m) => m.MercadoPagoWalletCheckout),
  { ssr: false, loading: () => null },
);

type Props = {
  amountLabel: string;
  disabled?: boolean;
  /** Negocio en contexto (GAE-17); requerido en API si la cuenta tiene tiendas. */
  negocioId?: string | null;
};

export function SuscripcionAbonoCheckout({ amountLabel, disabled, negocioId }: Props) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPreferenceId(null);
    try {
      const payload: { plan: string; negocioId?: string } = { plan: "mensual" };
      if (negocioId?.trim()) {
        payload.negocioId = negocioId.trim();
      }
      const res = await fetch("/api/mercadopago/saas/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        id?: string;
        init_point?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo iniciar el pago.");
      }
      if (data?.id) {
        setPreferenceId(data.id);
        return;
      }
      if (data?.init_point) {
        window.location.href = data.init_point;
        return;
      }
      throw new Error("Respuesta de pago incompleta.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar el pago.");
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Abono mensual: <span className="font-medium text-foreground">{amountLabel}</span>. El monto se confirma en el
        servidor; Mercado Pago no recibe precios desde el navegador.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!preferenceId ? (
        <Button type="button" onClick={startCheckout} disabled={disabled || loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparando pago…
            </>
          ) : (
            "Pagar abono con Mercado Pago"
          )}
        </Button>
      ) : (
        <MercadoPagoWalletCheckout preferenceId={preferenceId} />
      )}
    </div>
  );
}
