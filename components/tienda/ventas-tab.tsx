"use client";

import { createClient } from "@/lib/supabase/client";
import { listVentas } from "@/lib/queries/ventas";
import type { VentaRow } from "@/lib/types/negocio";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const metodoLabel: Record<string, string> = {
  cash: "Efectivo",
  mercado_pago: "Mercado Pago",
  transfer: "Transferencia",
};

const estadoLabel: Record<string, string> = {
  completed: "Completada",
  cancelled: "Cancelada",
};

type Props = { negocioId: string };

export function VentasTab({ negocioId }: Props) {
  const [rows, setRows] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: e } = await listVentas(supabase, negocioId);
    setLoading(false);
    if (e) {
      setError(e.message);
      return;
    }
    setRows((data as VentaRow[]) ?? []);
  }, [negocioId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando ventas…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="text-sm text-destructive border border-destructive/30 rounded-md p-3">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Vista de solo lectura. Las ventas se registrarán desde el punto de
        venta cuando lo implementes.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-2 font-medium">Fecha</th>
              <th className="p-2 font-medium">Total</th>
              <th className="p-2 font-medium">Pago</th>
              <th className="p-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  No hay ventas registradas.
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">
                    {new Date(v.created_at).toLocaleString("es")}
                  </td>
                  <td className="p-2">{String(v.total)}</td>
                  <td className="p-2">
                    {metodoLabel[v.metodo_pago] ?? v.metodo_pago}
                  </td>
                  <td className="p-2">
                    {estadoLabel[v.estado] ?? v.estado}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
