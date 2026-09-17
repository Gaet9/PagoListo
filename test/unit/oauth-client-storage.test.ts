import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
    MERCADOPAGO_OAUTH_CLIENT_STORAGE_KEYS,
    clearMercadoPagoOAuthClientStorage,
} from "@/lib/mercadopago/oauth-client-storage";

const ROOT = process.cwd();

function collectTsFiles(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === ".next") continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            collectTsFiles(full, out);
        } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
            out.push(full);
        }
    }
    return out;
}

/** Superficies MP/OAuth en cliente donde podría aparecer storage propio. */
function mercadoPagoClientStorageSurfaces(): string[] {
    const prefixes = [join(ROOT, "lib/mercadopago"), join(ROOT, "components/tienda"), join(ROOT, "components/perfil")];
    const hits: string[] = [];
    for (const prefix of prefixes) {
        for (const file of collectTsFiles(prefix)) {
            const rel = file.replace(`${ROOT}/`, "");
            if (rel === "lib/mercadopago/oauth-client-storage.ts") continue;
            const isMpSurface =
                rel.includes("mercadopago") || rel.includes("/oauth") || rel.includes("mp-oauth") || rel.includes("mp_oauth");
            if (!isMpSurface) continue;
            const content = readFileSync(file, "utf8");
            if (/\b(localStorage|sessionStorage)\.(setItem|getItem|removeItem)\b/.test(content)) {
                hits.push(rel);
            }
        }
    }
    return hits;
}

describe("clearMercadoPagoOAuthClientStorage", () => {
    it("no borra keys ajenas a MP cuando la lista está vacía", () => {
        sessionStorage.setItem("pagolisto:forgot-password-sent", "1");
        clearMercadoPagoOAuthClientStorage();
        expect(sessionStorage.getItem("pagolisto:forgot-password-sent")).toBe("1");
        expect(MERCADOPAGO_OAUTH_CLIENT_STORAGE_KEYS).toEqual([]);
    });

    it("superficies MP/OAuth del cliente no usan localStorage/sessionStorage (lista vacía justificada)", () => {
        expect(mercadoPagoClientStorageSurfaces(), "registrar nuevas keys en MERCADOPAGO_OAUTH_CLIENT_STORAGE_KEYS").toEqual(
            [],
        );
    });
});
