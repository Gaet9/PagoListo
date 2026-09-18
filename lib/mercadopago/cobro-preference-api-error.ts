/** Mensaje en español para errores al crear preferencia Checkout Pro (tienda). */
export function mercadoPagoCobroPreferenceErrorMessage(raw: string, httpStatus?: number): string {
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (httpStatus === 401 || lower.includes("invalid access token") || lower.includes("unauthorized")) {
    return "La conexión con Mercado Pago expiró. Desvinculá y volvé a vincular la cuenta en Configuración.";
  }
  if (httpStatus === 403) {
    return "Mercado Pago rechazó la operación. Revisá que la cuenta vinculada pueda cobrar con Checkout Pro.";
  }
  if (lower.includes("next_public_site_url") || lower.includes("back_urls")) {
    return "Falta configurar la URL pública del sitio (NEXT_PUBLIC_SITE_URL) para Checkout Pro.";
  }
  if (msg.length > 0 && msg.length <= 280 && !lower.includes("unknown error")) {
    return msg;
  }
  return "No se pudo crear el cobro en Mercado Pago. Reintentá en unos segundos.";
}
