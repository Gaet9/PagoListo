import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260923180000_gae17_roles_compras_productos_paywall.sql",
);

describe("GAE-17 STEP C migration", () => {
  it("abre compras/compra_items a miembros y restringe escritura de productos", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toMatch(/has_active_subscription_via_negocio_owner/i);
    expect(sql).toMatch(/CREATE POLICY compras_select_member/i);
    expect(sql).toMatch(/is_negocio_member\(negocio_id\)/);
    expect(sql).toMatch(/CREATE POLICY compra_items_insert_member/i);
    expect(sql).toMatch(/CREATE POLICY productos_insert_admin_owner/i);
    expect(sql).toMatch(/CREATE POLICY productos_update_admin_owner/i);
    expect(sql).toMatch(/has_negocio_role\(negocio_id, ARRAY\['owner'::text, 'admin'::text\]\)/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS compras_select_propietario/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS productos_insert_member/i);
  });
});
