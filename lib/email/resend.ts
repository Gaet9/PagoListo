import "server-only";

import { Resend } from "resend";

import { getResendApiKey, resolveResendFromAddress } from "@/lib/email/resend-config";

export {
  RESEND_FALLBACK_FROM,
  getResendApiKey,
  getResendFromAddress,
  resolveResendFromAddress,
} from "@/lib/email/resend-config";

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

  let fromAddress = from?.trim() || null;
  if (!fromAddress) {
    fromAddress = resolveResendFromAddress();
  }
  if (!fromAddress) {
    return {
      ok: false,
      message:
        "RESEND_FROM no está configurado. Agregalo al entorno de producción (p. ej. hola@pagolisto.com.ar).",
    };
  }

  let client: Resend;
  try {
    client = getResendClient();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "RESEND_API_KEY no está configurado.";
    return { ok: false, message };
  }
  const result = html
    ? await client.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
      })
    : await client.emails.send({
        from: fromAddress,
        to,
        subject,
        text: text!,
      });

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  if (!result.data?.id) {
    return { ok: false, message: "Resend no devolvió un id de envío." };
  }

  return { ok: true, id: result.data.id };
}
