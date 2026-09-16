import { describe, expect, it } from "vitest";

import { buildCheckoutProBackUrls } from "@/lib/mercadopago/checkout-pro-urls";
import {
  isMercadoPagoRetornoEstado,
  mercadoPagoRetornoStaticParams,
  MERCADOPAGO_RETORNO_ESTADOS,
} from "@/lib/mercadopago/retorno-estado";

describe("mercadopago retorno estado", () => {
  it("matches back_urls path segments from checkout pro", () => {
    const urls = buildCheckoutProBackUrls("https://app.test");
    expect(urls.success.endsWith("/mercadopago/retorno/exito")).toBe(true);
    expect(urls.pending.endsWith("/mercadopago/retorno/pendiente")).toBe(true);
    expect(urls.failure.endsWith("/mercadopago/retorno/error")).toBe(true);
    for (const { estado } of mercadoPagoRetornoStaticParams()) {
      expect(
        Object.values(urls).some((url) => url.endsWith(`/mercadopago/retorno/${estado}`)),
      ).toBe(true);
    }
    expect(MERCADOPAGO_RETORNO_ESTADOS).toHaveLength(3);
  });

  it("validates known estados", () => {
    expect(isMercadoPagoRetornoEstado("exito")).toBe(true);
    expect(isMercadoPagoRetornoEstado("pendiente")).toBe(true);
    expect(isMercadoPagoRetornoEstado("error")).toBe(true);
    expect(isMercadoPagoRetornoEstado("fallo")).toBe(false);
    expect(isMercadoPagoRetornoEstado("")).toBe(false);
  });

  it("generates static params for all back_url estados", () => {
    expect(mercadoPagoRetornoStaticParams()).toEqual([
      { estado: "exito" },
      { estado: "pendiente" },
      { estado: "error" },
    ]);
  });
});
