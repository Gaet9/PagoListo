import { BreadcrumbHomePrefix } from "@/components/breadcrumb-home-prefix";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TiendaDashboard } from "@/components/tienda/tienda-dashboard";
import { listNegocios } from "@/lib/queries/negocios";
import { persistActiveNegocioIdServer } from "@/lib/negocio/active-negocio-context";
import { resolveNegocioFromSlug } from "@/lib/negocio-slug";
import type { NegocioListItem } from "@/lib/types/negocio";
import { createClient } from "@/lib/supabase/server";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function TiendaSlugContent({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: negociosRaw, error } = await listNegocios(supabase);
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        No se pudieron cargar los negocios: {error.message}
      </div>
    );
  }

  const negocios = (negociosRaw ?? []) as NegocioListItem[];
  const match = resolveNegocioFromSlug(slug, negocios);
  if (!match) {
    notFound();
  }

  await persistActiveNegocioIdServer(match.id);

  if (negocios.length === 0) {
    redirect("/tiendas");
  }

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbHomePrefix />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/perfil">Perfil</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/tiendas">Tiendas</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[12rem] truncate">
              {match.nombre}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <TiendaDashboard
        initialNegocios={negocios}
        initialNegocioId={match.id}
      />
    </>
  );
}

export default function TiendaSlugPage({ params }: PageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
            Cargando tu tienda…
          </div>
        }
      >
        <TiendaSlugContent params={params} />
      </Suspense>
    </div>
  );
}
