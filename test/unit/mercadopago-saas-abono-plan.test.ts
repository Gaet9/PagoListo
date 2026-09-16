import { describe, it, expect, afterEach } from "vitest";

import { resolveSaasAbonoPlan } from "@/lib/mercadopago/saas-abono-plan";

describe("resolveSaasAbonoPlan", () => {
  const prevArs = process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS;
  const prevTitle = process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_TITLE;

  afterEach(() => {
    if (prevArs === undefined) delete process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS;
    else process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS = prevArs;
    if (prevTitle === undefined) delete process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_TITLE;
    else process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_TITLE = prevTitle;
  });

  it("reads monthly price from env", () => {
    process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS = "4500";
    const plan = resolveSaasAbonoPlan("mensual");
    expect(plan.unitPriceArs).toBe(4500);
    expect(plan.code).toBe("mensual");
  });

  it("rejects unknown plan codes", () => {
    process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS = "9990";
    expect(() => resolveSaasAbonoPlan("anual")).toThrow(/no válido/i);
  });

  it("accepts 100 ARS as a valid QA test price", () => {
    process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS = "100";
    const plan = resolveSaasAbonoPlan("mensual");
    expect(plan.unitPriceArs).toBe(100);
    expect(plan.code).toBe("mensual");
    const amountLabel = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
      plan.unitPriceArs,
    );
    expect(amountLabel.replace(/\s/g, "")).toContain("100,00");
  });

  it("throws neutral errors without placeholder wording", () => {
    delete process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS;
    expect(() => resolveSaasAbonoPlan("mensual")).toThrow(/no está configurado/i);
    process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS = "0";
    expect(() => resolveSaasAbonoPlan("mensual")).toThrow(/no es válido/i);
    process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS = "abc";
    let invalidMsg = "";
    try {
      resolveSaasAbonoPlan("mensual");
    } catch (err) {
      invalidMsg = err instanceof Error ? err.message : "";
    }
    expect(invalidMsg).toMatch(/no es válido/i);
    expect(invalidMsg).not.toMatch(/placeholder|9990|precio real/i);
  });
});
