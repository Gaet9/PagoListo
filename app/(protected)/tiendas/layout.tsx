import { SubscriptionLoadErrorBanner } from "@/components/auth/subscription-load-error-banner";
import { requirePaidUser } from "@/lib/auth/require-paid-user";
import { createClient } from "@/lib/supabase/server";

export default async function TiendasLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const paid = await requirePaidUser(supabase);
  if ("subscriptionLoadError" in paid) {
    return <SubscriptionLoadErrorBanner message={paid.subscriptionLoadError} />;
  }
  return children;
}
