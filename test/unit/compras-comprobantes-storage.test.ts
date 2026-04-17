import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  COMPRAS_COMPROBANTE_MAX_BYTES,
  getCompraComprobanteSignedUrl,
  uploadCompraComprobante,
} from "@/lib/storage/compras-comprobantes";

describe("compras-comprobantes storage", () => {
  it("rechaza archivos mayores al límite de 50 MB", async () => {
    const client = {} as SupabaseClient;
    const file = new File(["x"], "big.bin", { type: "application/octet-stream" });
    Object.defineProperty(file, "size", { value: COMPRAS_COMPROBANTE_MAX_BYTES + 1 });

    const r = await uploadCompraComprobante(client, "n1", file);
    expect(r.storagePath).toBeNull();
    expect(r.error?.message).toMatch(/50 MB/i);
  });

  it("getCompraComprobanteSignedUrl delega en createSignedUrl", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/signed" },
      error: null,
    });
    const client = {
      storage: {
        from: () => ({ createSignedUrl }),
      },
    } as unknown as SupabaseClient;

    const r = await getCompraComprobanteSignedUrl(client, "u/n/f.pdf", 120);
    expect(r.signedUrl).toBe("https://example.com/signed");
    expect(createSignedUrl).toHaveBeenCalledWith("u/n/f.pdf", 120);
  });
});
