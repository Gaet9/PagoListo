import crypto from "crypto";
import { describe, expect, it } from "vitest";

import {
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
  it("rejects when header is present but invalid", () => {
    expect(
      shouldRejectMercadoPagoWebhookForSignature({
        xSignature: "ts=1,v1=deadbeef",
        signatureOk: false,
        enforceWhenHeaderMissing: false,
      }),
    ).toBe(true);
  });

  it("allows missing header when not enforcing", () => {
    expect(
      shouldRejectMercadoPagoWebhookForSignature({
        xSignature: null,
        signatureOk: false,
        enforceWhenHeaderMissing: false,
      }),
    ).toBe(false);
  });

  it("rejects missing header when enforcing", () => {
    expect(
      shouldRejectMercadoPagoWebhookForSignature({
        xSignature: null,
        signatureOk: false,
        enforceWhenHeaderMissing: true,
      }),
    ).toBe(true);
  });
});
