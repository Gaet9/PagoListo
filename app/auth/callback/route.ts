import { getOAuthCallbackErrorMessage } from "@/lib/auth/oauth-error-message";
import { getSafeInternalNextPath } from "@/lib/auth/safe-next-path";
import { resolvePostAuthRedirectUrl } from "@/lib/auth/post-auth-redirect";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const next = getSafeInternalNextPath(searchParams.get("next"));

  if (!code) {
    const raw =
      searchParams.get("error_description") ??
      searchParams.get("error") ??
      "Falta el código de OAuth";
    const error = getOAuthCallbackErrorMessage(raw);
    return NextResponse.redirect(
      resolvePostAuthRedirectUrl(
        request,
        `/auth/error?error=${encodeURIComponent(error)}`,
      ),
    );
  }

  const successTarget = resolvePostAuthRedirectUrl(request, next);
  const response = NextResponse.redirect(successTarget);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: "pkce",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const message = getOAuthCallbackErrorMessage(error.message);
    return NextResponse.redirect(
      resolvePostAuthRedirectUrl(
        request,
        `/auth/error?error=${encodeURIComponent(message)}`,
      ),
    );
  }

  return response;
}
