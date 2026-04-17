import { BreadcrumbHomePrefix } from "@/components/breadcrumb-home-prefix";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TiendasCrearPrimera } from "@/components/tienda/tiendas-crear-primera";
import { TiendasSeleccionCards } from "@/components/tienda/tiendas-seleccion-cards";
import { buildNegocioSlug } from "@/lib/negocio-slug";
import { listNegocios } from "@/lib/queries/negocios";
import type { NegocioListItem } from "@/lib/types/negocio";
import { createClient } from "@/lib/supabase/server";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function TiendasIndexContent() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const { data: negociosRaw, error } = await listNegocios(supabase);
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        No se pudieron cargar los negocios: {error.message}
      </div>
    );
  }

  const negocios = (negociosRaw ?? []) as NegocioListItem[];

  if (negocios.length === 1) {
    const slug = buildNegocioSlug(negocios[0]!, negocios);
    redirect(`/tiendas/${slug}`);
  }

  if (negocios.length === 0) {
    return <TiendasCrearPrimera />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Mis tiendas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Elegí un negocio para abrir el panel de productos, ventas y stock.
        </p>
      </div>
      <TiendasSeleccionCards negocios={negocios} />
    </div>
  );
}

export default function TiendasPage() {
  return (
    <div className="flex flex-col gap-6">
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
            <BreadcrumbPage>Tiendas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
            Cargando tus tiendas…
          </div>
        }
      >
        <TiendasIndexContent />
      </Suspense>
    </div>
  );
}
