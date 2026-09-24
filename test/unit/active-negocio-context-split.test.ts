import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("active negocio context module split", () => {
  it("client module does not import next/headers", () => {
    const clientSource = readFileSync(
      resolve(process.cwd(), "lib/negocio/active-negocio-context.ts"),
      "utf8",
    );
    expect(clientSource).not.toMatch(/next\/headers/);
  });

  it("server module is marked server-only", () => {
    const serverSource = readFileSync(
      resolve(process.cwd(), "lib/negocio/active-negocio-context.server.ts"),
      "utf8",
    );
    expect(serverSource).toContain('import "server-only"');
    expect(serverSource).toContain("next/headers");
  });

  it("saas abono access client module does not import server cookie reader", () => {
    const clientSource = readFileSync(resolve(process.cwd(), "lib/auth/saas-abono-access.ts"), "utf8");
    expect(clientSource).not.toMatch(/active-negocio-context\.server/);
    expect(clientSource).not.toMatch(/next\/headers/);
  });
});
