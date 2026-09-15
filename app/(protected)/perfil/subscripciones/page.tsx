import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SuscripcionAbonoCheckout } from "@/components/perfil/suscripcion-abono-checkout";
import { PageShell } from "@/components/ui/page-shell";
import {
  fetchUserSubscription,
  isActiveSubscription,
  isSubscriptionEnforcementEnabled,
} from "@/lib/auth/user-subscription";
import { resolveSaasAbonoPlan } from "@/lib/mercadopago/saas-abono-plan";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function PerfilSubscripcionesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requiereAbono = sp.requiere_abono === "1" || sp.requiere_abono === "true";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect("/auth/login");
  }

  const row = await fetchUserSubscription(supabase, auth.user.id);
  const active = isActiveSubscription(row);

  let amountLabel = "—";
  let checkoutEnabled = false;
  try {
    const plan = resolveSaasAbonoPlan("mensual");
    amountLabel = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(plan.unitPriceArs);
    checkoutEnabled = true;
  } catch {
    amountLabel = "Configurá PAGOLISTO_SAAS_PLAN_MENSUAL_ARS en el servidor";
  }

  const enforcement = isSubscriptionEnforcementEnabled();

  return (
    <PageShell surface="card" padding="md" rounded="lg" className="space-y-4">
      {requiereAbono && enforcement && !active ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          Para usar <strong>Mi tienda</strong> necesitás un abono activo. Completá el pago abajo o volvé cuando el
          período esté vigente.
        </div>
      ) : null}

      {active ? (
        <div className="text-sm space-y-1">
          <div>
            Estado: <span className="font-medium text-foreground">Activo</span>
            {row?.plan_code ? <span className="text-muted-foreground"> ({row.plan_code})</span> : null}
          </div>
          {row?.current_period_end ? (
            <div className="text-xs text-muted-foreground">
              Vigente hasta: {new Date(row.current_period_end).toLocaleString("es-AR")}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {enforcement ?
            "Contratá el abono mensual para acceder a la gestión de tu comercio en PagoListo."
          : "El paywall está desactivado en este entorno (PAGOLISTO_SUBSCRIPTION_ENFORCE=false)."}
        </p>
      )}

      {!active ?
        <SuscripcionAbonoCheckout amountLabel={amountLabel} disabled={!checkoutEnabled} />
      : null}
    </PageShell>
  );
}

export default function PerfilSubscripcionesPage({ searchParams }: PageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Suscripción</h1>
        <p className="text-sm text-muted-foreground mt-1">Abono mensual de PagoListo vía Mercado Pago (Checkout Pro).</p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
            Cargando…
          </div>
        }
      >
        <PerfilSubscripcionesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
