"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { listCompraItemsByCompraId } from "@/lib/queries/compras";
import type { CompraItemRow } from "@/lib/types/negocio";
import { Loader2 } from "lucide-react";

type Props = { compraId: string };

function getProductoNombre(productos: CompraItemRow["productos"]) {
  if (!productos) return "Producto";
  return Array.isArray(productos) ? productos[0]?.nombre ?? "Producto" : productos.nombre;
}

function moneyARS(v: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(v);
}

function toNumber(v: string | number | null | undefined) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function CompraItemsPanel({ compraId }: Props) {
  const [items, setItems] = useState<CompraItemRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      const supabase = createClient();
      const { data, error } = await listCompraItemsByCompraId(supabase, compraId);
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setErr(error.message);
        return;
      }
      setItems((data as CompraItemRow[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [compraId]);

  if (loading) {
    return (
      <div className='flex items-center gap-2 py-4 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
        Cargando líneas de la compra…
      </div>
    );
  }

  if (err) {
    return <p className='text-sm text-destructive'>{err}</p>;
  }

  if (!items || items.length === 0) {
    return <div className='text-sm text-muted-foreground'>No hay líneas de productos para esta compra.</div>;
  }

  return (
    <div className='divide-y rounded-md border'>
      {items.map((it) => {
        const nombre = getProductoNombre(it.productos);
        const unit = moneyARS(toNumber(it.precio_unitario));
        const sub = moneyARS(
          it.subtotal !== null && it.subtotal !== undefined
            ? toNumber(it.subtotal)
            : toNumber(it.precio_unitario) * it.cantidad,
        );
        return (
          <div key={it.id} className='flex items-center justify-between gap-3 p-3'>
            <div className='min-w-0'>
              <div className='truncate font-medium'>{nombre}</div>
              <div className='text-xs text-muted-foreground'>
                {it.cantidad} × {unit}
              </div>
            </div>
            <div className='shrink-0 text-sm font-medium tabular-nums'>{sub}</div>
          </div>
        );
      })}
    </div>
  );
}
