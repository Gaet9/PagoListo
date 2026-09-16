export type SaasAbonoPlanCode = "mensual";

export type SaasAbonoPlan = {
  code: SaasAbonoPlanCode;
  title: string;
  unitPriceArs: number;
  currencyId: "ARS";
  quantity: 1;
};

const DEFAULT_PLAN_CODE: SaasAbonoPlanCode = "mensual";

function parsePositiveArs(raw: string | undefined): number {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new Error("El precio mensual del abono no está configurado.");
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("El precio mensual del abono no es válido.");
  }
  return value;
}

/** Precio y título del abono mensual PagoListo (solo servidor). */
export function resolveSaasAbonoPlan(planCode: string | undefined): SaasAbonoPlan {
  const code = (planCode?.trim() || DEFAULT_PLAN_CODE) as SaasAbonoPlanCode;
  if (code !== "mensual") {
    throw new Error("Plan de abono no válido.");
  }

  const unitPriceArs = parsePositiveArs(process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS);
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
