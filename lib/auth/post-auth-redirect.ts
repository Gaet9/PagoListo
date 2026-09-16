import type { NextRequest } from "next/server";

/**
 * URL absoluta para redirigir tras intercambio de sesión (OAuth, etc.).
 * Respeta `x-forwarded-*` en producción (Vercel, proxies).
 */
export function resolvePostAuthRedirectUrl(
  request: NextRequest,
  nextPath: string,
): URL {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    const proto =
      forwardedProto?.split(",")[0]?.trim() ??
      requestUrl.protocol.replace(":", "");
    const host = forwardedHost.split(",")[0]?.trim() ?? forwardedHost;
    return new URL(nextPath, `${proto}://${host}`);
  }

  return new URL(nextPath, requestUrl.origin);
}
