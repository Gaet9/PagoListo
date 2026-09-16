import {
    areEquivalentSiteHostnames,
    areEquivalentSiteOrigins,
    getConfiguredSiteOrigin,
} from "@/lib/mercadopago/oauth-site-host";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function effectivePort(u: URL): string {
    if (u.port) return u.port;
    return u.protocol === "https:" ? "443" : "80";
}

function isLoopbackHostname(hostname: string): boolean {
    return LOOPBACK_HOSTNAMES.has(hostname.toLowerCase());
}

/**
 * Origin usado al redirigir después del callback OAuth (paths relativos en `redirect_to`).
 *
 * En `NODE_ENV=development`, por defecto el navegador vuelve a `http://localhost:3000` (sesión
 * Supabase suele estar ahí) aunque `NEXT_PUBLIC_SITE_URL` sea ngrok para MP/webhooks.
 * Sobreescribí con `MERCADOPAGO_OAUTH_BROWSER_RETURN_ORIGIN` si querés volver al túnel en dev.
 *
 * En producción: `NEXT_PUBLIC_SITE_URL` + heurísticas de host (loopback / ngrok / etc.).
 */
export function getMercadoPagoOAuthPostConsentOrigin(requestUrl: URL): string {
    if (process.env.NODE_ENV === "development") {
        const raw = process.env.MERCADOPAGO_OAUTH_BROWSER_RETURN_ORIGIN?.trim();
        const chosen = raw && raw.length > 0 ? raw : "http://localhost:3000";
        try {
            const u = new URL(chosen.replace(/\/$/, ""));
            if (u.protocol === "http:" || u.protocol === "https:") {
                return u.origin;
            }
        } catch {
            // seguir con lógica de producción
        }
    }

    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!raw) return requestUrl.origin;

    let site: URL;
    try {
        site = new URL(raw.replace(/\/$/, ""));
    } catch {
        return requestUrl.origin;
    }

    const reqHost = requestUrl.hostname.toLowerCase();
    const siteHost = site.hostname.toLowerCase();
    const reqLoop = isLoopbackHostname(reqHost);
    const siteLoop = isLoopbackHostname(siteHost);

    if (reqLoop && !siteLoop) {
        return site.origin;
    }

    if (!reqLoop && siteLoop) {
        return requestUrl.origin;
    }

    if (siteHost === reqHost && effectivePort(site) === effectivePort(requestUrl)) {
        return site.origin;
    }

    if (
        !reqLoop &&
        !siteLoop &&
        areEquivalentSiteHostnames(siteHost, reqHost) &&
        site.protocol === requestUrl.protocol
    ) {
        // Producción: volver al host canónico de NEXT_PUBLIC_SITE_URL (p. ej. www) aunque el callback llegue al apex.
        return site.origin;
    }

    if (siteLoop && reqLoop) {
        return site.origin;
    }

    const configured = getConfiguredSiteOrigin();
    if (
        configured &&
        !reqLoop &&
        areEquivalentSiteOrigins(configured, requestUrl.origin)
    ) {
        return configured;
    }

    return requestUrl.origin;
}
