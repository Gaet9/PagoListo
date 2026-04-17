import Link from "next/link";

import type { NegocioListItem } from "@/lib/types/negocio";
import { buildNegocioSlug } from "@/lib/negocio-slug";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  negocios: NegocioListItem[];
};

export function TiendasSeleccionCards({ negocios }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {negocios.map((n) => {
        const slug = buildNegocioSlug(n, negocios);
        return (
          <Link key={n.id} href={`/tiendas/${slug}`} className="block min-w-0">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base truncate">{n.nombre}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {n.localizacion?.trim() || "Sin ubicación"}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
