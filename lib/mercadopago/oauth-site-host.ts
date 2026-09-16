/** Hostnames equivalent for OAuth return (apex ↔ www on the same registrable name). */
export function stripLeadingWww(hostname: string): string {
    return hostname.toLowerCase().replace(/^www\./, "");
}

export function areEquivalentSiteHostnames(a: string, b: string): boolean {
    if (a.toLowerCase() === b.toLowerCase()) return true;
    return stripLeadingWww(a) === stripLeadingWww(b);
}

export function getConfiguredSiteOrigin(): string | null {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!raw) return null;
    try {
        const u = new URL(raw.replace(/\/$/, ""));
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        return u.origin;
    } catch {
        return null;
    }
}

/** True when two origins differ only by www (same protocol and registrable host). */
export function areEquivalentSiteOrigins(originA: string, originB: string): boolean {
    try {
        const a = new URL(originA);
        const b = new URL(originB);
        if (a.protocol !== b.protocol) return false;
        return areEquivalentSiteHostnames(a.hostname, b.hostname);
    } catch {
        return false;
    }
}
