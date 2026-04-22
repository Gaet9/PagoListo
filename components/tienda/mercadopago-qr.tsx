"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

type Props = {
  value: string;
  size?: number;
};

export function MercadoPagoQr({ value, size = 280 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setError(null);
    (async () => {
      try {
        const url = await QRCode.toDataURL(value, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: size,
        });
        if (!cancelled) setDataUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo generar el QR.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!dataUrl) {
    return <p className="text-sm text-muted-foreground">Generando QR…</p>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="Código QR de pago"
      width={size}
      height={size}
      className="rounded-md border bg-white"
    />
  );
}

