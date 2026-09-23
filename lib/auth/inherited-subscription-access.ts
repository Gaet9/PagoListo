import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fetchUserSubscription,
  isActiveSubscription,
  isSubscriptionEnforcementEnabled,
} from "@/lib/auth/user-subscription";

/**
 * Abono propio o heredado del propietario de un negocio donde el usuario es miembro (GAE-17).
 */
export async function userHasEffectivePaidAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  if (!isSubscriptionEnforcementEnabled()) {
    return true;
  }

  try {
    const { row, error } = await fetchUserSubscription(supabase, userId);
    if (error) {
      return false;
    }
    if (isActiveSubscription(row)) {
      return true;
    }

    const { data: inherited, error: inheritErr } = await supabase.rpc(
      "has_active_subscription_via_negocio_owner",
    );
    if (inheritErr) {
      return false;
    }
    return inherited === true;
  } catch {
    return false;
  }
}
