import type { AppConfig } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { MessengerGateway } from "../../messenger/client.js";
import type { AppLogger } from "../../logging/logger.js";
import { splitMessage } from "../../utils/text.js";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /rate.?limit|too many requests|account protection|halted/i.test(error.message);
}

/**
 * Single outbound path for command responses and notices. It paces multi-part
 * replies, retries transient platform rate limits with backoff, and reports a
 * visible cooldown to the user instead of silently dropping the response.
 */
export class OutboxService {
  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
    private readonly messenger: MessengerGateway,
    private readonly logger: AppLogger,
  ) {}

  public async sendChunked(threadId: string, text: string): Promise<number> {
    const chunks = splitMessage(text, 1900);
    let sent = 0;
    for (const [index, chunk] of chunks.entries()) {
      if (index > 0 && this.config.announcements.obeyMessengerRateLimits) {
        await delay(1200);
      }
      const accepted = await this.sendWithRetry(threadId, chunk);
      if (!accepted) {
        await this.sendCooldownNotice(threadId);
        break;
      }
      sent += 1;
    }
    return sent;
  }

  public async sendSingle(threadId: string, text: string): Promise<boolean> {
    return this.sendWithRetry(threadId, text.slice(0, 1900));
  }

  private async sendWithRetry(threadId: string, text: string): Promise<boolean> {
    const antiSpam = this.config.rateLimiting.antiSpam;
    const maximumAttempts = 3;
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        await this.messenger.sendText(threadId, text);
        return true;
      } catch (error) {
        if (!isRateLimitError(error)) throw error;
        const backoff = Math.min(
          antiSpam.maximumDelayMs,
          antiSpam.initialDelayMs * 2 ** (attempt - 1),
        );
        this.logger.warn(
          { attempt, backoffMs: backoff, threadId },
          "Outbound rate limit hit; backing off before retry",
        );
        await delay(backoff);
      }
    }
    return false;
  }

  private async sendCooldownNotice(threadId: string): Promise<void> {
    const cooldownMs = this.config.rateLimiting.antiSpam.maximumDelayMs;
    await delay(cooldownMs);
    try {
      await this.messenger.sendText(
        threadId,
        `⏳ Outbound rate limit reached. I paused for ${Math.ceil(cooldownMs / 1000)}s. The response was not delivered — please repeat the command once messaging is available again.`,
      );
      this.logger.info({ threadId }, "Rate-limit cooldown notice delivered");
    } catch (error) {
      this.logger.warn(
        { threadId, error: error instanceof Error ? error.message : "notice failed" },
        "Could not deliver rate-limit cooldown notice",
      );
    }
  }
}
