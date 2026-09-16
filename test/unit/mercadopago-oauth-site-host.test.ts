import { describe, expect, it } from "vitest";

import {
    areEquivalentSiteHostnames,
    areEquivalentSiteOrigins,
    getConfiguredSiteOrigin,
    stripLeadingWww,
} from "@/lib/mercadopago/oauth-site-host";

describe("oauth-site-host", () => {
    it("stripLeadingWww normaliza www", () => {
        expect(stripLeadingWww("WWW.Pagolisto.com.ar")).toBe("pagolisto.com.ar");
        expect(stripLeadingWww("pagolisto.com.ar")).toBe("pagolisto.com.ar");
    });

    it("areEquivalentSiteHostnames acepta apex y www", () => {
        expect(areEquivalentSiteHostnames("www.pagolisto.com.ar", "pagolisto.com.ar")).toBe(true);
        expect(areEquivalentSiteHostnames("evil.com", "pagolisto.com.ar")).toBe(false);
    });

    it("areEquivalentSiteOrigins respeta protocolo", () => {
        expect(
            areEquivalentSiteOrigins("https://www.pagolisto.com.ar", "https://pagolisto.com.ar"),
        ).toBe(true);
        expect(
            areEquivalentSiteOrigins("http://www.pagolisto.com.ar", "https://www.pagolisto.com.ar"),
        ).toBe(false);
    });

    it("getConfiguredSiteOrigin parsea NEXT_PUBLIC_SITE_URL", () => {
        const prev = process.env.NEXT_PUBLIC_SITE_URL;
        process.env.NEXT_PUBLIC_SITE_URL = "https://www.pagolisto.com.ar/";
        expect(getConfiguredSiteOrigin()).toBe("https://www.pagolisto.com.ar");
        process.env.NEXT_PUBLIC_SITE_URL = prev;
    });
});
