"use client";

import { createClient } from "@/lib/supabase/client";
import { listMovimientosForNegocio } from "@/lib/queries/movimientos-stock";
import type { MovimientoStockRow } from "@/lib/types/negocio";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const tipoLabel: Record<string, string> = {
  in: "Entrada",
  out: "Salida",
  ajuste: "Ajuste",
};

const motivoLabel: Record<string, string> = {
  venta: "Venta",
  reposicion: "Reposición",
  perdida: "Pérdida",
  manual: "Manual",
};

function nombreProducto(m: MovimientoStockRow) {
  const p = m.productos as unknown;
  if (p && typeof p === "object" && !Array.isArray(p) && "nombre" in p) {
    return String((p as { nombre: string }).nombre);
  }
  if (Array.isArray(p) && p[0] && typeof p[0] === "object" && "nombre" in p[0]) {
    return String((p[0] as { nombre: string }).nombre);
  }
  return "—";
}

type Props = { negocioId: string };

export function MovimientosTab({ negocioId }: Props) {
  const [rows, setRows] = useState<MovimientoStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: e } = await listMovimientosForNegocio(
      supabase,
      negocioId,
    );
    setLoading(false);
    if (e) {
      setError(e.message);
      return;
    }
    setRows((data as MovimientoStockRow[]) ?? []);
  }, [negocioId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando movimientos…
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
        Historial de entradas, salidas y ajustes de stock (solo lectura).
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-2 font-medium">Fecha</th>
              <th className="p-2 font-medium">Producto</th>
              <th className="p-2 font-medium">Tipo</th>
              <th className="p-2 font-medium">Cantidad</th>
              <th className="p-2 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No hay movimientos de stock.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString("es")}
                  </td>
                  <td className="p-2">{nombreProducto(m)}</td>
                  <td className="p-2">{tipoLabel[m.tipo] ?? m.tipo}</td>
                  <td className="p-2">{m.cantidad}</td>
                  <td className="p-2">
                    {motivoLabel[m.motivo] ?? m.motivo}
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
