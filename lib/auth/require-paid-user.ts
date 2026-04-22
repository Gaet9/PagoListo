import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures the request is authenticated. Subscription / billing checks were
 * removed while payments are rebuilt from scratch.
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

  return { userId };
}
