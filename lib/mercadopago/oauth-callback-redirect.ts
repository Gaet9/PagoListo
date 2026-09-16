import { type MpOAuthErrorCode, type MpOAuthFlash, withMpOAuthFlashOnUrl } from "@/lib/mercadopago/oauth-return";

/** redirect_to se guarda como path relativo; new URL(path) sin base falla. */
export function resolveSafeRedirect(origin: string, redirectTo: string): URL {
    const base = new URL(origin);
    const trimmed = redirectTo.trim();
    if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return new URL("/tiendas?tab=configuracion", base);
    }
    const target = new URL(trimmed, base);
    if (target.origin !== base.origin) {
        return new URL("/tiendas?tab=configuracion", base);
    }
    return target;
}

export function defaultOAuthReturnUrl(origin: string): URL {
    return new URL("/tiendas?tab=configuracion", origin);
}

export function buildOAuthCallbackRedirect(origin: string, redirectTo: string | null | undefined, flash: MpOAuthFlash): URL {
    const base =
        redirectTo?.trim() ? resolveSafeRedirect(origin, redirectTo) : defaultOAuthReturnUrl(origin);
    return withMpOAuthFlashOnUrl(base, flash);
}

export function buildOAuthCallbackErrorRedirect(
    origin: string,
    redirectTo: string | null | undefined,
    code: MpOAuthErrorCode,
): URL {
    return buildOAuthCallbackRedirect(origin, redirectTo, { kind: "error", code, message: "" });
}
