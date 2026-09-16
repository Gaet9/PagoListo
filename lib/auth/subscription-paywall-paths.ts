import { SUBSCRIPTION_PAYWALL_PATH } from "@/lib/auth/require-paid-user";
import { isSubscriptionEnforcementEnabled } from "@/lib/auth/user-subscription";

/** Rutas autenticadas que pueden usarse sin abono activo (checkout / estado). */
const SUBSCRIPTION_PAYWALL_EXEMPT_PREFIXES = [
  "/auth",
  "/mercadopago/retorno",
  "/perfil",
  SUBSCRIPTION_PAYWALL_PATH,
] as const;

/** Rutas públicas (con o sin sesión) que no exigen abono. */
const SUBSCRIPTION_PAYWALL_PUBLIC_PREFIXES = ["/faq"] as const;

export function isSubscriptionPaywallExemptPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/") return true;
  for (const prefix of SUBSCRIPTION_PAYWALL_PUBLIC_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  for (const prefix of SUBSCRIPTION_PAYWALL_EXEMPT_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

/**
 * Si el middleware debe redirigir a la pantalla de abono antes de servir la ruta.
 */
export function shouldEnforceSubscriptionPaywall(pathname: string, isAuthenticated: boolean): boolean {
  if (!isAuthenticated) return false;
  if (!isSubscriptionEnforcementEnabled()) return false;
  if (isSubscriptionPaywallExemptPath(pathname)) return false;
  return true;
}

export function subscriptionPaywallRedirectUrl(requestUrl: URL): URL {
  const url = new URL(requestUrl.toString());
  url.pathname = SUBSCRIPTION_PAYWALL_PATH;
  url.search = "";
  url.searchParams.set("requiere_abono", "1");
  return url;
}
