"use client";

import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { useEffect, useState } from "react";

import { getMercadoPagoSaasPublicKey } from "@/lib/mercadopago/saas-public";

type Props = {
  preferenceId: string;
};

/**
 * Checkout Pro — brick Wallet (@mercadopago/sdk-react).
 * Cargar solo en el cliente (p. ej. con `next/dynamic` + `ssr: false`).
 */
export function MercadoPagoWalletCheckout({ preferenceId }: Props) {
  const [initError, setInitError] = useState<string | null>(null);
  const [inited, setInited] = useState(false);

  useEffect(() => {
    try {
      initMercadoPago(getMercadoPagoSaasPublicKey());
      setInited(true);
      setInitError(null);
    } catch (e) {
      setInitError(e instanceof Error ? e.message : "No se pudo leer la clave pública de Mercado Pago.");
    }
  }, []);

  if (initError) {
    return <p className="text-sm text-destructive">{initError}</p>;
  }

  if (!inited) {
    return null;
  }

  return (
    <div className="w-full max-w-[420px] min-h-[52px]">
      <Wallet
        key={preferenceId}
        initialization={{ preferenceId }}
        locale="es-AR"
        id="walletBrick_cobrar_tab"
      />
    </div>
  );
}
