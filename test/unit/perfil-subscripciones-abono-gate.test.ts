import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("perfil subscripciones abono gate", () => {
  it("redirects employees before rendering subscription pay UI", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/(protected)/perfil/subscripciones/page.tsx"),
      "utf8",
    );
    const contentStart = source.indexOf("async function PerfilSubscripcionesContent");
    expect(contentStart).toBeGreaterThan(-1);
    expect(source).toContain("saas-abono-access.server");
    const gateIndex = source.indexOf("getSaasAbonoAccessForUser", contentStart);
    const redirectIndex = source.indexOf('redirect("/perfil")', contentStart);
    const payUiIndex = source.indexOf("negocioId={activeNegocioId}", contentStart);
    expect(gateIndex).toBeGreaterThan(-1);
    expect(redirectIndex).toBeGreaterThan(gateIndex);
    expect(payUiIndex).toBeGreaterThan(redirectIndex);
  });
});
