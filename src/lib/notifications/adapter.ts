import "@/lib/server-guard";
import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  template: string;
}

export interface NotificationAdapter {
  sendEmail(msg: EmailMessage): Promise<{ providerMessageId: string | null }>;
}

/** Local/preview sink: logs a redacted line. Never sends real mail. */
class LogAdapter implements NotificationAdapter {
  async sendEmail(msg: EmailMessage) {
    const masked = maskEmail(msg.to);
    console.info(`[notify:log] template=${msg.template} to=${masked} subject="${msg.subject}"`);
    if (process.env.NODE_ENV !== "production") console.info(`[notify:log] body:\n${msg.text}`);
    return { providerMessageId: null };
  }
}

/** Resend via REST; used only when RESEND_API_KEY is configured. */
class ResendAdapter implements NotificationAdapter {
  constructor(private readonly apiKey: string) {}
  async sendEmail(msg: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    const json = (await res.json()) as { id?: string };
    return { providerMessageId: json.id ?? null };
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${(local ?? "").slice(0, 1)}***@${domain}`;
}

let adapter: NotificationAdapter | null = null;
export function getNotificationAdapter(): NotificationAdapter {
  if (!adapter) adapter = env.RESEND_API_KEY ? new ResendAdapter(env.RESEND_API_KEY) : new LogAdapter();
  return adapter;
}
