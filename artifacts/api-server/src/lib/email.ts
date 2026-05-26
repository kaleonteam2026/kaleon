// Graceful email dispatch. If a configured provider is available, send;
// otherwise log and no-op.

import { logger } from "./logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailDispatchResult {
  ok: boolean;
  reason?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(msg: EmailMessage): Promise<EmailDispatchResult> {
  if (!isEmailConfigured()) {
    logger.info({ to: msg.to, subject: msg.subject }, "[email no-op] not configured");
    return { ok: false, reason: "not_configured" };
  }
  try {
    const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: { email: process.env.EMAIL_FROM },
        subject: msg.subject,
        content: [{ type: "text/plain", value: msg.text }],
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      logger.warn({ status: r.status, body }, "Email send failed");
      return { ok: false, reason: `provider_${r.status}` };
    }
    return { ok: true };
  } catch (err) {
    logger.warn({ err }, "Email send threw");
    return { ok: false, reason: "exception" };
  }
}
