import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("perfil subscripciones abono gate", () => {
  it("redirects employees before rendering subscription pay UI", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/(protected)/perfil/subscripciones/page.tsx"),
      "utf8",
    );
    const gateIndex = source.indexOf("getSaasAbonoAccessForUser");
    const redirectIndex = source.indexOf('redirect("/perfil")');
    const h1Index = source.indexOf("<h1>Suscripción</h1>");
    expect(gateIndex).toBeGreaterThan(-1);
    expect(redirectIndex).toBeGreaterThan(gateIndex);
    expect(h1Index).toBeGreaterThan(redirectIndex);
  });
});
