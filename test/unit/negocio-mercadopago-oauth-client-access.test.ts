import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/** Recursively collect .ts/.tsx files under dir (skip node_modules). */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "migrations") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("negocio_mercadopago_oauth client access regression", () => {
  it("only server admin paths reference the token table", () => {
    const allowedPrefixes = [
      join(ROOT, "app/api/mercadopago"),
      join(ROOT, "lib/mercadopago"),
    ];

    const hits: string[] = [];
    for (const file of collectSourceFiles(ROOT)) {
      const content = readFileSync(file, "utf8");
      if (!content.includes("negocio_mercadopago_oauth")) continue;

      const allowed = allowedPrefixes.some((p) => file.startsWith(p));
      if (!allowed) {
        hits.push(file.replace(`${ROOT}/`, ""));
      }

      if (file.includes("components/") || file.includes("app/(protected)/")) {
        hits.push(`client-surface:${file.replace(`${ROOT}/`, "")}`);
      }

      if (content.includes('from("negocio_mercadopago_oauth")') && !content.includes("createAdminClient")) {
        const usesBrowserClient =
          content.includes("createBrowserClient") ||
          (content.includes("createClient") && !file.includes("/admin") && !file.includes("api/"));
        if (usesBrowserClient && !file.includes("test/")) {
          hits.push(`non-admin-client:${file.replace(`${ROOT}/`, "")}`);
        }
      }
    }

    expect(hits, `Unexpected negocio_mercadopago_oauth usage:\n${hits.join("\n")}`).toEqual([]);
  });
});
