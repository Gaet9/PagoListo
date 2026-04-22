import "server-only";

import crypto from "crypto";

export type MercadoPagoOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
  public_key?: string;
  user_id?: number;
  live_mode?: boolean;
};

function base64Url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getMercadoPagoOAuthClientId(): string {
  const v = process.env.MERCADOPAGO_OAUTH_CLIENT_ID?.trim();
  if (!v) throw new Error("MERCADOPAGO_OAUTH_CLIENT_ID is not set.");
  return v;
}

export function getMercadoPagoOAuthClientSecret(): string {
  const v = process.env.MERCADOPAGO_OAUTH_CLIENT_SECRET?.trim();
  if (!v) throw new Error("MERCADOPAGO_OAUTH_CLIENT_SECRET is not set.");
  return v;
}

export function getMercadoPagoOAuthRedirectUri(): string {
  const explicit = process.env.MERCADOPAGO_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) throw new Error("MERCADOPAGO_OAUTH_REDIRECT_URI (or NEXT_PUBLIC_SITE_URL) is not set.");
  return `${site.replace(/\/$/, "")}/api/mercadopago/oauth/callback`;
}

export { getMercadoPagoOAuthPostConsentOrigin } from "./oauth-post-consent-origin";

export function newPkceCodeVerifier(): string {
  // RFC 7636: 43..128 chars. We'll use 32 bytes -> 43 chars base64url.
  return base64Url(crypto.randomBytes(32));
}

export function pkceChallengeS256(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64Url(hash);
}

export function buildMercadoPagoAuthorizeUrl(input: { state: string; codeChallenge?: string }) {
  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", getMercadoPagoOAuthClientId());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", getMercadoPagoOAuthRedirectUri());
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", "offline_access payments write");
  if (input.codeChallenge) {
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

export function newOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export async function exchangeCodeForToken(input: {
  code: string;
  codeVerifier?: string | null;
}): Promise<MercadoPagoOAuthTokenResponse> {
  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: getMercadoPagoOAuthClientId(),
      client_secret: getMercadoPagoOAuthClientSecret(),
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: getMercadoPagoOAuthRedirectUri(),
      ...(input.codeVerifier ? { code_verifier: input.codeVerifier } : {}),
    }),
  });

  const data = (await res.json().catch(() => null)) as MercadoPagoOAuthTokenResponse | { message?: string } | null;
  const hasAccessToken =
    data &&
    typeof data === "object" &&
    "access_token" in data &&
    typeof (data as { access_token?: unknown }).access_token === "string";
  if (!res.ok || !hasAccessToken) {
    const msg =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `Mercado Pago OAuth token error (${res.status})`;
    throw new Error(msg);
  }
  return data as MercadoPagoOAuthTokenResponse;
}

export async function refreshMercadoPagoAccessToken(input: { refresh_token: string }): Promise<MercadoPagoOAuthTokenResponse> {
  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: getMercadoPagoOAuthClientId(),
      client_secret: getMercadoPagoOAuthClientSecret(),
      grant_type: "refresh_token",
      refresh_token: input.refresh_token,
    }),
  });

  const data = (await res.json().catch(() => null)) as MercadoPagoOAuthTokenResponse | { message?: string } | null;
  const hasAccessToken =
    data &&
    typeof data === "object" &&
    "access_token" in data &&
    typeof (data as { access_token?: unknown }).access_token === "string";
  if (!res.ok || !hasAccessToken) {
    const msg =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `Mercado Pago OAuth refresh error (${res.status})`;
    throw new Error(msg);
  }
  return data as MercadoPagoOAuthTokenResponse;
}

