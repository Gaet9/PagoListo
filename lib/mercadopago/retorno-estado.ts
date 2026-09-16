/** Segmentos de `/mercadopago/retorno/[estado]` alineados con {@link buildCheckoutProBackUrls}. */
export const MERCADOPAGO_RETORNO_ESTADOS = ["exito", "pendiente", "error"] as const;

export type MercadoPagoRetornoEstado = (typeof MERCADOPAGO_RETORNO_ESTADOS)[number];

export function isMercadoPagoRetornoEstado(value: string): value is MercadoPagoRetornoEstado {
  return (MERCADOPAGO_RETORNO_ESTADOS as readonly string[]).includes(value);
}

export function mercadoPagoRetornoStaticParams(): { estado: MercadoPagoRetornoEstado }[] {
  return MERCADOPAGO_RETORNO_ESTADOS.map((estado) => ({ estado }));
}
