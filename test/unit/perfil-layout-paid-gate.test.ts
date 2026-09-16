import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it, expect } from "vitest";

/**
 * Guardrail: paywall redirect must run in layout (outside page Suspense) to avoid Next 500
 * with cacheComponents + redirect under Suspense.
 */
describe("perfil cuenta paid-user gate placement", () => {
  it("calls requirePaidUser in cuenta layout, not inside page Suspense children", () => {
    const layoutSource = readFileSync(
      resolve(process.cwd(), "app/(protected)/perfil/(cuenta)/layout.tsx"),
      "utf8",
    );
    const pageSource = readFileSync(
      resolve(process.cwd(), "app/(protected)/perfil/(cuenta)/page.tsx"),
      "utf8",
    );
    const subscripcionesSource = readFileSync(
      resolve(process.cwd(), "app/(protected)/perfil/subscripciones/page.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("requirePaidUser");
    expect(pageSource).not.toContain("requirePaidUser");
    expect(subscripcionesSource).not.toContain("requirePaidUser");
  });
});
