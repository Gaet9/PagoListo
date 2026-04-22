import "server-only";

import { MercadoPagoConfig } from "mercadopago";

export function getMercadoPagoClientForAccessToken(accessToken: string): MercadoPagoConfig {
  const token = accessToken.trim();
  if (!token) {
    throw new Error("Mercado Pago access token is empty");
  }
  return new MercadoPagoConfig({ accessToken: token });
}

