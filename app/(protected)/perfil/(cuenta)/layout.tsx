import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SubscriptionLoadErrorBanner } from "@/components/auth/subscription-load-error-banner";
import { requirePaidUser } from "@/lib/auth/require-paid-user";
import { createClient } from "@/lib/supabase/server";

async function PerfilCuentaPaidGate({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const paid = await requirePaidUser(supabase);
  if ("subscriptionLoadError" in paid) {
    return <SubscriptionLoadErrorBanner message={paid.subscriptionLoadError} />;
  }
  return children;
}

export default function PerfilCuentaLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-muted-foreground py-12" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin" />
          Verificando acceso…
        </div>
      }
    >
      <PerfilCuentaPaidGate>{children}</PerfilCuentaPaidGate>
    </Suspense>
  );
}
