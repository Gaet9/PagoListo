import { areEquivalentSiteOrigins, getConfiguredSiteOrigin } from "@/lib/mercadopago/oauth-site-host";

export function getMercadoPagoOAuthRedirectUri(): string {
  const explicit = process.env.MERCADOPAGO_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) throw new Error("MERCADOPAGO_OAUTH_REDIRECT_URI (or NEXT_PUBLIC_SITE_URL) is not set.");
  const base = site.replace(/\/$/, "");
  return `${base}/api/mercadopago/oauth/callback`;
}

/**
 * Si `MERCADOPAGO_OAUTH_REDIRECT_URI` override apunta a otro host que `NEXT_PUBLIC_SITE_URL`
 * (sin equivalencia apex/www), MP suele mostrar «la aplicación no puede conectarse» antes del login.
 */
export function getMercadoPagoOAuthRedirectUriMismatchWarning(): string | null {
  const explicit = process.env.MERCADOPAGO_OAUTH_REDIRECT_URI?.trim();
  if (!explicit) return null;

  const siteOrigin = getConfiguredSiteOrigin();
  if (!siteOrigin) return null;

  let redirectOrigin: string;
  try {
    redirectOrigin = new URL(getMercadoPagoOAuthRedirectUri()).origin;
  } catch {
    return "MERCADOPAGO_OAUTH_REDIRECT_URI no es una URL válida.";
  }

  if (areEquivalentSiteOrigins(redirectOrigin, siteOrigin)) return null;

  return (
    `[mp-oauth] MERCADOPAGO_OAUTH_REDIRECT_URI (${getMercadoPagoOAuthRedirectUri()}) no alinea con NEXT_PUBLIC_SITE_URL (${siteOrigin}). ` +
    "El authorize usa el override; debe coincidir byte a byte con el panel MP y con el host canónico del sitio."
  );
}
