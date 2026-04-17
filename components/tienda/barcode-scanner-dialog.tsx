"use client";

import { Button } from "@/components/ui/button";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  onDetected: (text: string) => void;
  closeOnDetected?: boolean;
};

export function BarcodeScannerDialog({
  open,
  onClose,
  onDetected,
  closeOnDetected = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const closeOnDetectedRef = useRef(closeOnDetected);
  const lastDetectedRef = useRef<{ text: string; atMs: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  onDetectedRef.current = onDetected;
  onCloseRef.current = onClose;
  closeOnDetectedRef.current = closeOnDetected;

  // Lock background scroll reliably while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setErr(null);
      return;
    }
    lastDetectedRef.current = null;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;
    const video = videoRef.current;

    const callback: Parameters<
      BrowserMultiFormatReader["decodeFromConstraints"]
    >[2] = (result, _decodeErr, controls) => {
      if (cancelled || !result?.getText()) return;
      const text = result.getText().trim();
      if (!text) return;

      // Prevent repeated scans of the same code in a short window.
      const now = Date.now();
      const last = lastDetectedRef.current;
      if (last && last.text === text && now - last.atMs < 1500) return;
      lastDetectedRef.current = { text, atMs: now };

      onDetectedRef.current(text);
      if (closeOnDetectedRef.current) {
        cancelled = true;
        controls.stop();
        controlsRef.current = null;
        onCloseRef.current();
      }
    };

    const start = async () => {
      setErr(null);
      if (!video) {
        setErr("No se pudo iniciar el video. Probá cerrar y volver a abrir.");
        return;
      }
      try {
        try {
          controlsRef.current = await reader.decodeFromConstraints(
            { video: { facingMode: "environment" } },
            video,
            callback,
          );
        } catch {
          controlsRef.current = await reader.decodeFromVideoDevice(
            undefined,
            video,
            callback,
          );
        }
      } catch (e) {
        if (!cancelled) {
          setErr(
            e instanceof Error
              ? e.message
              : "No se pudo usar la cámara. Comprueba permisos y HTTPS.",
          );
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      readerRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background p-4 pb-safe-bottom"
      role="dialog"
      aria-modal="true"
      aria-label="Escanear código de barras"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-medium">
          Apunta la cámara al código de barras del producto
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onClose}
          aria-label="Cerrar escáner"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex-1 min-h-scanner-frame rounded-lg overflow-hidden bg-scanner-video border border-border">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
        />
      </div>

      {err ? (
        <p className="mt-3 text-sm text-destructive text-center">{err}</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground text-center">
          El código se rellenará solo al leerlo bien.
        </p>
      )}

      <Button type="button" variant="secondary" className="mt-4" onClick={onClose}>
        Cancelar
      </Button>
    </div>,
    document.body,
  );
}
