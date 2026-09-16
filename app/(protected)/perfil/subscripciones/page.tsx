import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SuscripcionAbonoCheckout } from "@/components/perfil/suscripcion-abono-checkout";
import { SuscripcionCancelButton } from "@/components/perfil/suscripcion-cancel-button";
import {
  subscriptionAllowsCancel,
  subscriptionAllowsCheckout,
  SuscripcionEstadoResumen,
} from "@/components/perfil/suscripcion-estado-resumen";
import { PageShell } from "@/components/ui/page-shell";
import {
  fetchUserSubscription,
  isSubscriptionEnforcementEnabled,
  resolveSubscriptionUiPhase,
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
  const phase = resolveSubscriptionUiPhase(row);
  const enforcement = isSubscriptionEnforcementEnabled();

  let amountLabel = "—";
  let checkoutEnabled = false;
  try {
    const plan = resolveSaasAbonoPlan("mensual");
    amountLabel = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(plan.unitPriceArs);
    checkoutEnabled = true;
  } catch {
    amountLabel = "Configurá PAGOLISTO_SAAS_PLAN_MENSUAL_ARS en el servidor";
  }

  const accessUntilLabel =
    row?.current_period_end ?
      new Date(row.current_period_end).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
    : "el fin del período vigente";

  return (
    <PageShell surface="card" padding="md" rounded="lg" className="space-y-4">
      {requiereAbono && enforcement && phase !== "active" && phase !== "canceled_until_end" ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          Para usar <strong>PagoListo</strong> necesitás un abono activo. Completá el pago abajo o volvé cuando el
          período esté vigente.
        </div>
      ) : null}

      <SuscripcionEstadoResumen row={row} enforcementEnabled={enforcement} />

      {subscriptionAllowsCheckout(row) ?
        <SuscripcionAbonoCheckout amountLabel={amountLabel} disabled={!checkoutEnabled} />
      : null}

      {subscriptionAllowsCancel(row) ?
        <SuscripcionCancelButton accessUntilLabel={accessUntilLabel} />
      : null}

      <p className="text-xs text-muted-foreground">
        El abono es un pago mensual único vía Mercado Pago (Checkout Pro). En sandbox usá cuentas de prueba; en
        producción configurá <code className="tutorial-code">MERCADOPAGO_ACCESS_TOKEN_SAAS</code> y el webhook en tu
        URL pública (<code className="tutorial-code">/api/mercadopago/webhook</code>).
      </p>
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
