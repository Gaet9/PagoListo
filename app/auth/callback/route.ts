import { getSafeInternalNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);

    const code = searchParams.get("code");
    const next = getSafeInternalNextPath(searchParams.get("next"));

  if (!code) {
    const error =
      searchParams.get("error_description") ?? "Falta el código de OAuth";
        return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(error)}`, origin));
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return NextResponse.redirect(new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, origin));
    }

    redirect(next);
}
