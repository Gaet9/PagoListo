import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { PageShell } from "@/components/ui/page-shell";
import { createClient } from "@/lib/supabase/server";

type SubscriptionRow = {
  status: string;
  current_period_end: string | null;
};

async function PerfilSubscripcionesContent() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect("/auth/login");
  }

  const { data: row } = await supabase
    .from("suscripciones_usuario")
    .select("status, current_period_end")
    .eq("user_id", auth.user.id)
    .maybeSingle<SubscriptionRow>();

  return (
    <PageShell surface="card" padding="md" rounded="lg" className="space-y-4">
      <p className="text-sm text-muted-foreground">
        La integración de pagos y suscripciones se está rearmando. Cuando esté lista, vas a poder
        contratar y administrar tu plan desde acá.
      </p>
      {row ? (
        <div className="text-sm border-t pt-4">
          <div>
            Estado en base de datos:{" "}
            <span className="font-medium text-foreground">{row.status}</span>
          </div>
          {row.current_period_end ? (
            <div className="text-xs text-muted-foreground mt-1">
              Vence: {new Date(row.current_period_end).toLocaleString("es-AR")}
            </div>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}

export default function PerfilSubscripcionesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Suscripción</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestioná tu plan cuando el cobro vuelva a estar disponible.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
            Cargando…
          </div>
        }
      >
        <PerfilSubscripcionesContent />
      </Suspense>
    </div>
  );
}
