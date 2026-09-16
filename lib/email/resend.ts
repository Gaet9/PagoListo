import "server-only";

import { Resend } from "resend";

import { getResendApiKey, getResendFromAddress } from "@/lib/email/resend-config";

export { RESEND_FALLBACK_FROM, getResendApiKey, getResendFromAddress } from "@/lib/email/resend-config";

export function getResendClient(): Resend {
  return new Resend(getResendApiKey());
}

export type SendTransactionalEmailInput = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
};

export type SendTransactionalEmailResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput
): Promise<SendTransactionalEmailResult> {
  const { to, subject, text, html, from } = input;
  if (!text && !html) {
    return { ok: false, message: "Se requiere text o html." };
  }

  const client = getResendClient();
  const result = await client.emails.send({
    from: from ?? getResendFromAddress(),
    to,
    subject,
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
  });

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  if (!result.data?.id) {
    return { ok: false, message: "Resend no devolvió un id de envío." };
  }

  return { ok: true, id: result.data.id };
}
