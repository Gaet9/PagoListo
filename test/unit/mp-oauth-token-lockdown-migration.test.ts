import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const LOCKDOWN_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260916120000_mp_oauth_token_lockdown_harden.sql",
);

const GAE24_MIGRATION = join(process.cwd(), "supabase/migrations/20260915210000_mp_cobro_oauth_security.sql");

describe("mp oauth token lockdown migrations (GAE-8 / GAE-24)", () => {
  it("20260916120000 drops owner policies and revokes client roles", () => {
    const sql = readFileSync(LOCKDOWN_MIGRATION, "utf8");
    expect(sql).toMatch(/DROP POLICY IF EXISTS negocio_mercadopago_oauth_select_owner/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS negocio_mercadopago_oauth_insert_owner/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS negocio_mercadopago_oauth_update_owner/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS negocio_mercadopago_oauth_delete_owner/i);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.negocio_mercadopago_oauth FROM authenticated/i);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.negocio_mercadopago_oauth FROM anon/i);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.negocio_mercadopago_oauth TO service_role/i);
    expect(sql).toMatch(/FORCE ROW LEVEL SECURITY/i);
  });

  it("20260916120000 includes post-apply assert block", () => {
    const sql = readFileSync(LOCKDOWN_MIGRATION, "utf8");
    expect(sql).toContain("expected 0 RLS policies");
    expect(sql).toContain("anon/authenticated must not have DML grants");
  });

  it("20260915210000 revokes anon/authenticated before mp_cobro_intentos column", () => {
    const sql = readFileSync(GAE24_MIGRATION, "utf8");
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.negocio_mercadopago_oauth FROM authenticated/i);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.negocio_mercadopago_oauth FROM anon/i);
    expect(sql).not.toMatch(/CREATE POLICY negocio_mercadopago_oauth_select_owner/i);
  });
});
