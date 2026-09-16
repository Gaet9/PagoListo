"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  accessUntilLabel: string;
  disabled?: boolean;
};

export function SuscripcionCancelButton({ accessUntilLabel, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConfirm = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo cancelar la suscripción.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelando…
              </>
            ) : (
              "Cancelar suscripción"
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar el abono?</AlertDialogTitle>
            <AlertDialogDescription>
              Seguirás teniendo acceso a PagoListo hasta{" "}
              <span className="font-medium text-foreground">{accessUntilLabel}</span>. Después de esa fecha no se
              renovará automáticamente (podés volver a pagar el abono mensual cuando quieras).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Volver</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={onConfirm} disabled={loading}>
              Confirmar cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
