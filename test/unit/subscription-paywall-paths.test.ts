import { describe, it, expect, afterEach } from "vitest";

import {
  isSubscriptionPaywallExemptPath,
  shouldEnforceSubscriptionPaywall,
} from "@/lib/auth/subscription-paywall-paths";

describe("isSubscriptionPaywallExemptPath", () => {
  it("exempts home, auth, retorno MP and subscription checkout", () => {
    expect(isSubscriptionPaywallExemptPath("/")).toBe(true);
    expect(isSubscriptionPaywallExemptPath("/auth/login")).toBe(true);
    expect(isSubscriptionPaywallExemptPath("/mercadopago/retorno/aprobado")).toBe(true);
    expect(isSubscriptionPaywallExemptPath("/perfil/subscripciones")).toBe(true);
  });

  it("exempts only subscription checkout under perfil, not the rest of perfil", () => {
    expect(isSubscriptionPaywallExemptPath("/perfil/subscripciones")).toBe(true);
    expect(isSubscriptionPaywallExemptPath("/perfil")).toBe(false);
    expect(isSubscriptionPaywallExemptPath("/tiendas")).toBe(false);
  });
});

describe("shouldEnforceSubscriptionPaywall", () => {
  const prev = process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;

  afterEach(() => {
    if (prev === undefined) delete process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE;
    else process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = prev;
  });

  it("enforces for authenticated app routes when enabled", () => {
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "true";
    expect(shouldEnforceSubscriptionPaywall("/tiendas", true)).toBe(true);
    expect(shouldEnforceSubscriptionPaywall("/perfil", true)).toBe(true);
    expect(shouldEnforceSubscriptionPaywall("/perfil/subscripciones", true)).toBe(false);
  });

  it("skips when unauthenticated or disabled", () => {
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "true";
    expect(shouldEnforceSubscriptionPaywall("/tiendas", false)).toBe(false);
    process.env.PAGOLISTO_SUBSCRIPTION_ENFORCE = "false";
    expect(shouldEnforceSubscriptionPaywall("/tiendas", true)).toBe(false);
  });
});
