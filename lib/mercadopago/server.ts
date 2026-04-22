import "server-only";

import { MercadoPagoConfig } from "mercadopago";

/**
 * Access token privé de l’application Mercado Pago « SaaS / Checkout Pro »
 * (OAuth vendeurs, préférences, paiements). Réservé au serveur.
 * L’abonnement plateforme utilisera une seconde app MP (autres variables, plus tard).
 */
export function getMercadoPagoSaasAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN_SAAS?.trim();
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN_SAAS is not set. Add it to your environment (e.g. .env.local)."
    );
  }
  return token;
}

/** Client SDK Mercado Pago pour l’app Checkout Pro / SaaS. */
export function getMercadoPagoSaasClient(): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: getMercadoPagoSaasAccessToken() });
}
