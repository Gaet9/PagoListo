/**
 * Clé publique de l’application Mercado Pago « SaaS / Checkout Pro »
 * (OAuth vendeurs, préférences de paiement côté client si requis).
 * Préfixe NEXT_PUBLIC_ : exposée au navigateur — ne pas y mettre le access token.
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
