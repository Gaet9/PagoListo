"use client";

import { useRouter } from "next/navigation";

import { CrearNegocioForm } from "@/components/tienda/crear-negocio-form";
import type { NegocioListItem } from "@/lib/types/negocio";
import { buildNegocioSlug } from "@/lib/negocio-slug";

export function TiendasCrearPrimera() {
  const router = useRouter();

  const onCreated = (n: NegocioListItem) => {
    const slug = buildNegocioSlug(n, [n]);
    router.push(`/tiendas/${slug}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Mis tiendas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Creá tu primer negocio para gestionar productos, ventas y stock.
        </p>
      </div>
      <CrearNegocioForm onCreated={onCreated} />
    </div>
  );
}
