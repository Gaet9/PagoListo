import type { UserSubscriptionRow } from "@/lib/auth/user-subscription";
import { resolveSubscriptionUiPhase } from "@/lib/auth/user-subscription";

const PLAN_LABELS: Record<string, string> = {
  mensual: "Abono mensual",
};

function formatPlanLabel(planCode: string | null | undefined): string {
  if (!planCode) return "PagoListo";
  return PLAN_LABELS[planCode] ?? planCode;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

type Props = {
  row: UserSubscriptionRow | null;
  enforcementEnabled: boolean;
};

export function SuscripcionEstadoResumen({ row, enforcementEnabled }: Props) {
  const phase = resolveSubscriptionUiPhase(row);
  const planLabel = formatPlanLabel(row?.plan_code);
  const periodEndLabel =
    row?.current_period_end ? formatDateTime(row.current_period_end) : null;

  if (phase === "none") {
    return (
      <div className="text-sm space-y-1">
        <div className="text-muted-foreground">
          {enforcementEnabled ?
            "Sin abono activo. Contratá el plan mensual para usar la app."
          : "Sin abono registrado (paywall desactivado en este entorno)."}
        </div>
      </div>
    );
  }

  if (phase === "active") {
    return (
      <div className="text-sm space-y-1">
        <div>
          Plan: <span className="font-medium text-foreground">{planLabel}</span>
        </div>
        <div>
          Estado: <span className="font-medium text-foreground">Activo</span>
        </div>
        {periodEndLabel ?
          <div className="text-xs text-muted-foreground">Próxima renovación / fin de período: {periodEndLabel}</div>
        : null}
      </div>
    );
  }

  if (phase === "canceled_until_end") {
    return (
      <div className="text-sm space-y-1">
        <div>
          Plan: <span className="font-medium text-foreground">{planLabel}</span>
        </div>
        <div>
          Estado: <span className="font-medium text-foreground">Cancelada</span>
        </div>
        {periodEndLabel ?
          <div className="text-xs text-muted-foreground">Acceso hasta: {periodEndLabel}</div>
        : null}
        {row?.canceled_at ?
          <div className="text-xs text-muted-foreground">Cancelada el: {formatDateTime(row.canceled_at)}</div>
        : null}
      </div>
    );
  }

  return (
    <div className="text-sm space-y-1">
      <div>
        Estado: <span className="font-medium text-foreground">Vencida</span>
      </div>
      {periodEndLabel ?
        <div className="text-xs text-muted-foreground">Finalizó: {periodEndLabel}</div>
      : null}
    </div>
  );
}

export function subscriptionAllowsCancel(row: UserSubscriptionRow | null): boolean {
  return resolveSubscriptionUiPhase(row) === "active";
}

export function subscriptionAllowsCheckout(row: UserSubscriptionRow | null): boolean {
  const phase = resolveSubscriptionUiPhase(row);
  return phase === "none" || phase === "expired";
}
