export type SaasAbonoPlanCode = "mensual";

export type SaasAbonoPlan = {
  code: SaasAbonoPlanCode;
  title: string;
  unitPriceArs: number;
  currencyId: "ARS";
  quantity: 1;
};

const DEFAULT_PLAN_CODE: SaasAbonoPlanCode = "mensual";

/** Valor típico de prueba / placeholder en deploys; no usar como precio real en UI ni Checkout. */
const PLACEHOLDER_MONTHLY_ARS = 100;

function parsePositiveArs(raw: string | undefined, envName: string): number {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new Error(`${envName} is not set. Configure the monthly SaaS price on the server.`);
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${envName} must be a positive number.`);
  }
  if (value === PLACEHOLDER_MONTHLY_ARS) {
    throw new Error(
      `${envName}=${PLACEHOLDER_MONTHLY_ARS} parece un placeholder de prueba. Configurá el precio mensual real (p. ej. 9990 ARS en producción).`,
    );
  }
  return value;
}

/** Precio y título del abono mensual PagoListo (solo servidor). */
export function resolveSaasAbonoPlan(planCode: string | undefined): SaasAbonoPlan {
  const code = (planCode?.trim() || DEFAULT_PLAN_CODE) as SaasAbonoPlanCode;
  if (code !== "mensual") {
    throw new Error("Plan de abono no válido.");
  }

  const unitPriceArs = parsePositiveArs(process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS, "PAGOLISTO_SAAS_PLAN_MENSUAL_ARS");
  const title =
    process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_TITLE?.trim() || "PagoListo — Abono mensual";

  return {
    code,
    title,
    unitPriceArs,
    currencyId: "ARS",
    quantity: 1,
  };
}

export function getMercadoPagoSaasAbonoWebhookUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/mercadopago/webhook`;
}
