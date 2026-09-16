export function getMercadoPagoOAuthRedirectUri(): string {
  const explicit = process.env.MERCADOPAGO_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) throw new Error("MERCADOPAGO_OAUTH_REDIRECT_URI (or NEXT_PUBLIC_SITE_URL) is not set.");
  const base = site.replace(/\/$/, "");
  return `${base}/api/mercadopago/oauth/callback`;
}
