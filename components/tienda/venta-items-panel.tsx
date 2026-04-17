"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { listVentaItemsByVentaId } from "@/lib/queries/ventas";
import type { VentaItemRow } from "@/lib/types/negocio";
import { Loader2 } from "lucide-react";

type Props = { ventaId: string };

function getProductoNombre(
  productos: VentaItemRow["productos"],
) {
  if (!productos) return "Producto";
  return Array.isArray(productos)
    ? productos[0]?.nombre ?? "Producto"
    : productos.nombre;
}

function moneyARS(v: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(v);
}

function toNumber(v: string | number | null | undefined) {
  const n =
    typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function VentaItemsPanel({ ventaId }: Props) {
  const [items, setItems] = useState<VentaItemRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      const supabase = createClient();
      const { data, error } = await listVentaItemsByVentaId(supabase, ventaId);
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setErr(error.message);
        return;
      }
      setItems((data as VentaItemRow[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [ventaId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando detalle…
      </div>
    );
  }

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>;
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No hay detalle de productos para esta venta.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-md border">
      {items.map((it) => {
        const nombre = getProductoNombre(it.productos);
        const unit = moneyARS(toNumber(it.precio_unitario));
        const sub = moneyARS(
          it.subtotal !== null && it.subtotal !== undefined
            ? toNumber(it.subtotal)
            : toNumber(it.precio_unitario) * it.cantidad,
        );
        return (
          <div
            key={it.id}
            className="p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{nombre}</div>
              <div className="text-xs text-muted-foreground">
                {it.cantidad} × {unit}
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums">{sub}</div>
          </div>
        );
      })}
    </div>
  );
}
