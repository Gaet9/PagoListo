import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { NavShopLink } from "@/components/nav-shop-link";
import { hasEnvVars } from "@/lib/utils";

export function SiteNav() {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <Link href="/" className="font-semibold text-base tracking-tight">
          Negocios
        </Link>
        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <div className="flex items-center gap-1">
            <Suspense fallback={null}>
              <NavShopLink />
            </Suspense>
            <Suspense fallback={null}>
              <AuthButton />
            </Suspense>
          </div>
        )}
      </div>
    </nav>
  );
}
