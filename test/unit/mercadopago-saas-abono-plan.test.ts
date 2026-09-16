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
  });

  it("throws when monthly price env is missing", () => {
    delete process.env.PAGOLISTO_SAAS_PLAN_MENSUAL_ARS;
    expect(() => resolveSaasAbonoPlan("mensual")).toThrow(/not set/i);
  });
});
