import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  mercadoPagoWebhookRequiresSignatureHeader,
  shouldRejectMercadoPagoWebhookForSignature,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago/webhook-signature";

function sign(secret: string, dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("verifyMercadoPagoWebhookSignature", () => {
  const secret = "test-webhook-secret";

  it("accepts a valid x-signature", () => {
    const dataId = "12345";
    const requestId = "req-abc";
    const ts = "1700000000";
    const xSignature = sign(secret, dataId, requestId, ts);
    expect(
      verifyMercadoPagoWebhookSignature({
        secret,
        xSignature,
        xRequestId: requestId,
        dataId,
      }),
    ).toBe(true);
  });

  it("rejects tampered v1", () => {
    const dataId = "99";
    const requestId = "req-1";
    const ts = "1700000001";
    const xSignature = sign(secret, dataId, requestId, ts).replace(/v1=[a-f0-9]+/, "v1=00");
    expect(
      verifyMercadoPagoWebhookSignature({
        secret,
        xSignature,
        xRequestId: requestId,
        dataId,
      }),
    ).toBe(false);
  });
});

describe("shouldRejectMercadoPagoWebhookForSignature", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.MERCADOPAGO_WEBHOOK_ALLOW_UNSIGNED;
    delete process.env.MERCADOPAGO_WEBHOOK_ENFORCE_SIGNATURE;
  });

  afterEach(() => {
    process.env = env;
  });

  it("rejects when header is present but invalid", () => {
    expect(
      shouldRejectMercadoPagoWebhookForSignature({
        xSignature: "ts=1,v1=deadbeef",
        signatureOk: false,
        enforceWhenHeaderMissing: false,
      }),
    ).toBe(true);
  });

  it("rejects missing header by default (secure)", () => {
    expect(mercadoPagoWebhookRequiresSignatureHeader()).toBe(true);
    expect(
      shouldRejectMercadoPagoWebhookForSignature({
        xSignature: null,
        signatureOk: false,
      }),
    ).toBe(true);
  });

  it("allows missing header when ALLOW_UNSIGNED=true", () => {
    process.env.MERCADOPAGO_WEBHOOK_ALLOW_UNSIGNED = "true";
    expect(mercadoPagoWebhookRequiresSignatureHeader()).toBe(false);
    expect(
      shouldRejectMercadoPagoWebhookForSignature({
        xSignature: null,
        signatureOk: false,
      }),
    ).toBe(false);
  });

  it("allows missing header when legacy ENFORCE_SIGNATURE=false", () => {
    process.env.MERCADOPAGO_WEBHOOK_ENFORCE_SIGNATURE = "false";
    expect(mercadoPagoWebhookRequiresSignatureHeader()).toBe(false);
  });
});
