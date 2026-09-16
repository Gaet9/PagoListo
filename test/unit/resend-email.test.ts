import { afterEach, describe, expect, it } from "vitest";

import {
  RESEND_FALLBACK_FROM,
  getResendApiKey,
  getResendFromAddress,
} from "@/lib/email/resend-config";

describe("resend email env", () => {
  const prevKey = process.env.RESEND_API_KEY;
  const prevFrom = process.env.RESEND_FROM;

  afterEach(() => {
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (prevFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = prevFrom;
  });

  it("getResendApiKey reads trimmed key from env", () => {
    process.env.RESEND_API_KEY = "  re_test_key  ";
    expect(getResendApiKey()).toBe("re_test_key");
  });

  it("getResendApiKey throws when missing", () => {
    delete process.env.RESEND_API_KEY;
    expect(() => getResendApiKey()).toThrow(/RESEND_API_KEY/);
  });

  it("getResendFromAddress prefers RESEND_FROM", () => {
    process.env.RESEND_FROM = "  hola@pagolisto.com.ar  ";
    expect(getResendFromAddress()).toBe("hola@pagolisto.com.ar");
  });

  it("getResendFromAddress falls back for unverified domain setup", () => {
    delete process.env.RESEND_FROM;
    expect(getResendFromAddress()).toBe(RESEND_FALLBACK_FROM);
  });
});
