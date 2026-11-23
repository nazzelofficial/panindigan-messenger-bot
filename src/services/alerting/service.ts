import nodemailer from "nodemailer";
import type { AppConfig, ResolvedSecrets } from "../../config/index.js";
import type { AppLogger } from "../../logging/logger.js";

export type AlertSeverity = "info" | "warning" | "critical";

/** Optional operational alerts. Every channel uses credentials from the environment. */
export class AlertService {
  public constructor(
    private readonly config: AppConfig,
    private readonly secrets: ResolvedSecrets,
    private readonly logger: AppLogger,
  ) {}

  public async send(severity: AlertSeverity, title: string, message: string): Promise<void> {
    if (!this.config.alerting.enabled) return;
    const body = `[${severity.toUpperCase()}] ${title}\n${message}`;
    await Promise.allSettled([
      this.sendEmail(title, body),
      this.sendTelegram(body),
      this.sendDiscord(body),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") {
          this.logger.warn({ error: String(result.reason) }, "Alert channel delivery failed");
        }
      }
    });
  }

  private async sendEmail(subject: string, body: string): Promise<void> {
    const settings = this.config.alerting.email;
    if (!settings.enabled || !this.secrets.smtpUsername || !this.secrets.smtpPassword) return;
    const transport = nodemailer.createTransport({
      host: this.secrets.smtpHost ?? "localhost",
      port: Number(this.secrets.smtpPort ?? 587),
      secure: Number(this.secrets.smtpPort ?? 587) === 465,
      auth: { user: this.secrets.smtpUsername, pass: this.secrets.smtpPassword },
    });
    await transport.sendMail({
      from: this.secrets.smtpFrom ?? this.secrets.smtpUsername,
      to: settings.recipients.join(", "),
      subject: `${this.config.application.name}: ${subject}`,
      text: body,
    });
    await transport.close();
  }

  private async sendTelegram(text: string): Promise<void> {
    const settings = this.config.alerting.telegram;
    if (!settings.enabled || !this.secrets.telegramBotToken) return;
    for (const chatId of settings.chatIds) {
      const response = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(this.secrets.telegramBotToken)}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) throw new Error(`Telegram returned HTTP ${response.status}`);
    }
  }

  private async sendDiscord(text: string): Promise<void> {
    if (!this.config.alerting.discord.enabled || !this.secrets.discordWebhookUrl) return;
    const response = await fetch(this.secrets.discordWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text.slice(0, 1900) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Discord returned HTTP ${response.status}`);
  }
}
