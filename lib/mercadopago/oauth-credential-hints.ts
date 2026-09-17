/** Mercado Pago access tokens / public keys (no usar como OAuth client_id). */
export function looksLikeMercadoPagoCredentialToken(value: string): boolean {
  const v = value.trim();
  return /^(TEST-|APP_USR-|APP-)/i.test(v);
}

export function isMercadoPagoSandboxCredentialPrefix(value: string): boolean {
  return value.trim().toUpperCase().startsWith("TEST-");
}

/**
 * Avisos de configuración (solo logs). No bloquean el authorize: MP valida client_id/redirect.
 * OAuth no lee MERCADOPAGO_ACCESS_TOKEN_SAAS ni public keys; un smell TEST en SaaS suele indicar app MP de prueba en Vercel.
 */
export function getMercadoPagoOAuthStartConfigWarnings(): string[] {
  const warnings: string[] = [];

  const clientId = process.env.MERCADOPAGO_OAUTH_CLIENT_ID?.trim() ?? "";
  if (clientId && looksLikeMercadoPagoCredentialToken(clientId)) {
    warnings.push(
      "[mp-oauth] MERCADOPAGO_OAUTH_CLIENT_ID parece un access token o public key (TEST-/APP_USR-). " +
        "Debe ser el número de aplicación (App ID) de la app MP de cobro/OAuth en producción.",
    );
  }

  const clientSecret = process.env.MERCADOPAGO_OAUTH_CLIENT_SECRET?.trim() ?? "";
  if (clientSecret && looksLikeMercadoPagoCredentialToken(clientSecret)) {
    warnings.push(
      "[mp-oauth] MERCADOPAGO_OAUTH_CLIENT_SECRET parece un access token, no el Client Secret de la aplicación.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    const saasToken = process.env.MERCADOPAGO_ACCESS_TOKEN_SAAS?.trim() ?? "";
    if (saasToken && isMercadoPagoSandboxCredentialPrefix(saasToken)) {
      warnings.push(
        "[mp-oauth] MERCADOPAGO_ACCESS_TOKEN_SAAS usa prefijo TEST- (sandbox). No afecta el authorize OAuth, " +
          "pero suele indicar que las credenciales MP en Vercel son de prueba; verificá que MERCADOPAGO_OAUTH_CLIENT_ID/SECRET sean de la app de cobro en modo producción.",
      );
    }

    const saasPublic = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS?.trim() ?? "";
    if (saasPublic && isMercadoPagoSandboxCredentialPrefix(saasPublic)) {
      warnings.push(
        "[mp-oauth] NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SAAS usa prefijo TEST- (sandbox). Misma verificación de app MP producción para OAuth.",
      );
    }
  }

  return warnings;
}
