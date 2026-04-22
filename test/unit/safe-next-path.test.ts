import { describe, expect, it } from "vitest";

import { getSafeInternalNextPath } from "@/lib/auth/safe-next-path";

describe("getSafeInternalNextPath", () => {
    it("defaults when empty or invalid", () => {
        expect(getSafeInternalNextPath(null)).toBe("/perfil");
        expect(getSafeInternalNextPath("")).toBe("/perfil");
        expect(getSafeInternalNextPath("//evil.com")).toBe("/perfil");
        expect(getSafeInternalNextPath("https://evil.com")).toBe("/perfil");
    });

    it("allows internal paths", () => {
        expect(getSafeInternalNextPath("/tiendas/foo")).toBe("/tiendas/foo");
        expect(getSafeInternalNextPath("/tiendas/foo?tab=configuracion")).toBe("/tiendas/foo?tab=configuracion");
    });

    it("blocks auth and api", () => {
        expect(getSafeInternalNextPath("/auth/login")).toBe("/perfil");
        expect(getSafeInternalNextPath("/api/x")).toBe("/perfil");
    });
});
