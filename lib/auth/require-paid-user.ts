import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fetchUserSubscription,
  isActiveSubscription,
  isSubscriptionEnforcementEnabled,
} from "@/lib/auth/user-subscription";

export const SUBSCRIPTION_PAYWALL_PATH = "/perfil/subscripciones";

export type RequirePaidUserResult =
  | { userId: string }
  | { userId: string; subscriptionLoadError: string };

/**
 * Autenticación + paywall de abono SaaS cuando `PAGOLISTO_SUBSCRIPTION_ENFORCE` está activo.
 */
export async function requirePaidUser(supabase: SupabaseClient): Promise<RequirePaidUserResult> {
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    redirect("/auth/login");
  }

  const claims = auth.claims as Record<string, unknown>;
  const userId = typeof claims?.sub === "string" ? (claims.sub as string) : null;
  if (!userId) {
    redirect("/auth/login");
  }

  if (!isSubscriptionEnforcementEnabled()) {
    return { userId };
  }

  const { row, error } = await fetchUserSubscription(supabase, userId);
  if (error) {
    return { userId, subscriptionLoadError: error };
  }

  if (isActiveSubscription(row)) {
    return { userId };
  }

  const { data: inherited, error: inheritErr } = await supabase.rpc(
    "has_active_subscription_via_negocio_owner",
  );
  if (inheritErr) {
    return { userId, subscriptionLoadError: inheritErr.message };
  }
  if (inherited !== true) {
    redirect(`${SUBSCRIPTION_PAYWALL_PATH}?requiere_abono=1`);
  }

  return { userId };
}
