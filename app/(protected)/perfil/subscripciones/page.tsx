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
import { getSaasAbonoAccessForUser } from "@/lib/auth/saas-abono-access";
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

export default async function PerfilSubscripcionesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect("/auth/login");
  }

  const { canManage } = await getSaasAbonoAccessForUser(supabase, auth.user.id);
  if (!canManage) {
    redirect("/perfil");
  }

  const sp = await searchParams;
  const requiereAbono = sp.requiere_abono === "1" || sp.requiere_abono === "true";

  const { row, error: subscriptionError } = await fetchUserSubscription(supabase, auth.user.id);
  const phase = resolveSubscriptionUiPhase(row);
  const enforcement = isSubscriptionEnforcementEnabled();

  let amountLabel = "—";
  let planConfigError: string | null = null;
  let checkoutEnabled = false;
  try {
    const plan = resolveSaasAbonoPlan("mensual");
    amountLabel = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(plan.unitPriceArs);
    checkoutEnabled = true;
  } catch {
    planConfigError = "No se pudo cargar el precio del abono. Revisá la configuración en el servidor.";
    amountLabel = "—";
  }

  const accessUntilLabel =
    row?.current_period_end ?
      new Date(row.current_period_end).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
    : "el fin del período vigente";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Suscripción</h1>
        <p className="text-sm text-muted-foreground mt-1">Abono mensual de PagoListo vía Mercado Pago (Checkout Pro).</p>
      </div>

      <Suspense fallback={null}>
        <PageShell surface="card" padding="md" rounded="lg" className="space-y-4">
          {requiereAbono && enforcement && phase !== "active" && phase !== "canceled_until_end" ? (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              Para usar <strong>PagoListo</strong> necesitás un abono activo. Completá el pago abajo o volvé cuando el
              período esté vigente.
            </div>
          ) : null}

          {subscriptionError ?
            <p className="text-sm text-destructive">
              No se pudo cargar el estado de tu suscripción: {subscriptionError}
            </p>
          :   <SuscripcionEstadoResumen row={row} enforcementEnabled={enforcement} />}

          {planConfigError ?
            <p className="text-sm text-destructive">{planConfigError}</p>
          : null}

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
      </Suspense>
    </div>
  );
}
