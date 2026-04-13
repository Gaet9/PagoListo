"use client";

import type { NegocioListItem } from "@/lib/types/negocio";
import { CrearNegocioForm } from "./crear-negocio-form";
import { MovimientosTab } from "./movimientos-tab";
import { ProductosTab } from "./productos-tab";
import { VentasTab } from "./ventas-tab";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type TabId = "productos" | "ventas" | "movimientos";

const tabs: { id: TabId; label: string }[] = [
  { id: "productos", label: "Productos" },
  { id: "ventas", label: "Ventas" },
  { id: "movimientos", label: "Movimientos de stock" },
];

type Props = {
  initialNegocios: NegocioListItem[];
};

export function TiendaDashboard({ initialNegocios }: Props) {
  const [negocios, setNegocios] = useState<NegocioListItem[]>(initialNegocios);
  const [tab, setTab] = useState<TabId>("productos");

  const [negocioId, setNegocioId] = useState(
    () => initialNegocios[0]?.id ?? "",
  );

  const currentNegocioId = useMemo(() => {
    if (!negocios.some((n) => n.id === negocioId) && negocios[0]) {
      return negocios[0].id;
    }
    return negocioId;
  }, [negocios, negocioId]);

  if (negocios.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1>Mi tienda</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona productos, ventas y stock de tu negocio.
          </p>
        </div>
        <CrearNegocioForm
          onCreated={(n) => {
            setNegocios([n]);
            setNegocioId(n.id);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1>Mi tienda</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Datos de tu negocio: tablas enlazadas a Supabase con RLS.
          </p>
        </div>
        {negocios.length > 1 ? (
          <div className="flex flex-col gap-1 min-w-negocio-select">
            <label
              htmlFor="negocio-select"
              className="text-xs font-medium text-muted-foreground"
            >
              Negocio activo
            </label>
            <select
              id="negocio-select"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={currentNegocioId}
              onChange={(e) => setNegocioId(e.target.value)}
            >
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-dashboard-tab">
        {tab === "productos" ? (
          <ProductosTab negocioId={currentNegocioId} />
        ) : null}
        {tab === "ventas" ? (
          <VentasTab negocioId={currentNegocioId} />
        ) : null}
        {tab === "movimientos" ? (
          <MovimientosTab negocioId={currentNegocioId} />
        ) : null}
      </div>
    </div>
  );
}
