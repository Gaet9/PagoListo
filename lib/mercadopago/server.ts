import "server-only";

import { MercadoPagoConfig } from "mercadopago";

/**
 * Access token de la app Mercado Pago « SaaS / abono » (Checkout Pro plataforma).
 * Distinto del OAuth por negocio (`MERCADOPAGO_OAUTH_CLIENT_ID` / tokens en `negocio_mercadopago_oauth`).
 * Solo servidor.
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
