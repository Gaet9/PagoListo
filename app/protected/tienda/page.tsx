import { TiendaDashboard } from "@/components/tienda/tienda-dashboard";
import { listNegocios } from "@/lib/queries/negocios";
import type { NegocioListItem } from "@/lib/types/negocio";
import { createClient } from "@/lib/supabase/server";
import { Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function TiendaContent() {
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

  const initialNegocios = (negociosRaw ?? []) as NegocioListItem[];

  return <TiendaDashboard initialNegocios={initialNegocios} />;
}

export default function TiendaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          Cargando tu tienda…
        </div>
      }
    >
      <TiendaContent />
    </Suspense>
  );
}
