/**
 * Public Key de la app Mercado Pago « SaaS / abono » (Checkout Pro plataforma).
 * No usar para OAuth de vinculación de tiendas (`MERCADOPAGO_OAUTH_*`).
 * Prefijo NEXT_PUBLIC_: expuesta al navegador — no poner access tokens aquí.
 */
export function getMercadoPagoSaasPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS?.trim();
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS is not set. Add it to your environment (e.g. .env.local)."
    );
  }
  return key;
}
