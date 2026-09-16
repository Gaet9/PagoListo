import { describe, expect, it } from "vitest";

import {
  isMercadoPagoPaymentNotification,
  parseMercadoPagoWebhookNotification,
} from "@/lib/mercadopago/webhook-notification-parse";

describe("parseMercadoPagoWebhookNotification", () => {
  it("parses legacy IPN query topic=payment", () => {
    const params = new URLSearchParams("topic=payment&id=999");
    const parsed = parseMercadoPagoWebhookNotification(params, null);
    expect(parsed.paymentId).toBe("999");
    expect(
      isMercadoPagoPaymentNotification({
        topic: parsed.topic,
        queryType: parsed.queryType,
        bodyType: parsed.bodyType,
        action: parsed.action,
        paymentId: parsed.paymentId,
      }),
    ).toBe(true);
  });

  it("parses Webhooks v2 query data.id and body action payment.updated", () => {
    const params = new URLSearchParams("data.id=123456&type=payment");
    const parsed = parseMercadoPagoWebhookNotification(params, {
      action: "payment.updated",
      data: { id: "123456" },
      type: "payment",
    });
    expect(parsed.paymentId).toBe("123456");
    expect(parsed.signatureDataId).toBe("123456");
    expect(
      isMercadoPagoPaymentNotification({
        topic: parsed.topic,
        queryType: parsed.queryType,
        bodyType: parsed.bodyType,
        action: parsed.action,
        paymentId: parsed.paymentId,
      }),
    ).toBe(true);
  });

  it("accepts payment.updated without type field when payment id is present", () => {
    const params = new URLSearchParams();
    const parsed = parseMercadoPagoWebhookNotification(params, {
      action: "payment.updated",
      data: { id: "42" },
    });
    expect(parsed.paymentId).toBe("42");
    expect(
      isMercadoPagoPaymentNotification({
        topic: parsed.topic,
        queryType: parsed.queryType,
        bodyType: parsed.bodyType,
        action: parsed.action,
        paymentId: parsed.paymentId,
      }),
    ).toBe(true);
  });
});
