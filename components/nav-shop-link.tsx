import Link from "next/link";
import { Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export async function NavShopLink() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return null;
  }

  return (
    <Button asChild variant="ghost" size="sm" className="gap-1.5">
      <Link href="/protected/tienda" title="Mi tienda">
        <Store className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Mi tienda</span>
      </Link>
    </Button>
  );
}
