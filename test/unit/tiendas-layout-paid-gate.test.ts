import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it, expect } from "vitest";

/**
 * Guardrail: paywall redirect must run in layout (outside page Suspense) to avoid Next 500
 * with cacheComponents + redirect under Suspense.
 */
describe("tiendas paid-user gate placement", () => {
  it("calls requirePaidUser in layout, not inside page Suspense children", () => {
    const layoutSource = readFileSync(
      resolve(process.cwd(), "app/(protected)/tiendas/layout.tsx"),
      "utf8",
    );
    const pageSource = readFileSync(resolve(process.cwd(), "app/(protected)/tiendas/page.tsx"), "utf8");
    const slugPageSource = readFileSync(
      resolve(process.cwd(), "app/(protected)/tiendas/[slug]/page.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("requirePaidUser");
    expect(pageSource).not.toContain("requirePaidUser");
    expect(slugPageSource).not.toContain("requirePaidUser");
  });
});
