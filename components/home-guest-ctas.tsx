import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export async function HomeGuestCTAs() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center pt-2">
      <Button asChild size="lg">
        <Link href="/auth/sign-up">Crear cuenta</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/auth/login">Iniciar sesión</Link>
      </Button>
    </div>
  );
}
