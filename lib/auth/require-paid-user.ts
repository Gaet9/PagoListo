import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { userHasActiveSubscription } from "@/lib/auth/user-subscription";

export const SUBSCRIPTION_PAYWALL_PATH = "/perfil/subscripciones";

/**
 * Autenticación + paywall de abono SaaS cuando `PAGOLISTO_SUBSCRIPTION_ENFORCE` está activo.
 */
export async function requirePaidUser(supabase: SupabaseClient) {
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const claims = auth.claims as Record<string, unknown>;
  const userId = typeof claims?.sub === "string" ? (claims.sub as string) : null;
  if (!userId) {
    redirect("/auth/login");
  }

  const hasAccess = await userHasActiveSubscription(supabase, userId);
  if (!hasAccess) {
    redirect(`${SUBSCRIPTION_PAYWALL_PATH}?requiere_abono=1`);
  }

  return { userId };
}
