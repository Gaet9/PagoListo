import { createHmac, randomUUID, timingSafeEqual } from "crypto";

type MercadoPagoOAuthStatePayload = {
  v: 1;
  negocio_id: string;
  nonce: string;
  iat: number;
};

function getSecret() {
  const secret = process.env.MERCADOPAGO_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("Falta MERCADOPAGO_OAUTH_STATE_SECRET");
  }
  return secret;
}

function sign(input: string) {
  return createHmac("sha256", getSecret()).update(input).digest("base64url");
}

export function createMercadoPagoOAuthState(negocioId: string) {
  const payload: MercadoPagoOAuthStatePayload = {
    v: 1,
    negocio_id: negocioId,
    nonce: randomUUID(),
    iat: Date.now(),
  };

  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf8").toString("base64url");
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function parseMercadoPagoOAuthState(state: string) {
  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return null;

  const expectedSig = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(json) as MercadoPagoOAuthStatePayload;
    if (payload?.v !== 1) return null;
    if (!payload.negocio_id) return null;
    if (!payload.iat) return null;
    return payload;
  } catch {
    return null;
  }
}

