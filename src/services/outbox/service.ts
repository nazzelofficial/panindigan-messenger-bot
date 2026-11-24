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
  /** Per-thread FIFO chain: every reply to a thread is serialized so chunks
   * stay adjacent and in order, and a fast burst cannot bury another reply. */
  readonly #queues = new Map<string, Promise<unknown>>();

  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
    private readonly messenger: MessengerGateway,
    private readonly logger: AppLogger,
  ) {}

  /** Serializes a job on a thread's queue and returns its result. */
  private enqueue<T>(threadId: string, job: () => Promise<T>): Promise<T> {
    const previous = this.#queues.get(threadId) ?? Promise.resolve();
    // The stored chain swallows its own rejections so a failed job never
    // becomes an unhandled rejection; the CALLER still gets the real promise
    // and can await/catch it as before.
    const next = previous.then(job, () => job());
    const tracked = next.catch(() => undefined);
    this.#queues.set(threadId, tracked);
    // Keep the map from growing forever: drop the entry once it is settled
    // and no newer job has been chained onto it.
    void tracked.finally(() => {
      if (this.#queues.get(threadId) === tracked) this.#queues.delete(threadId);
    });
    return next;
  }

  public async sendChunked(threadId: string, text: string): Promise<number> {
    return this.enqueue(threadId, () => this.#sendChunkedNow(threadId, text));
  }

  async #sendChunkedNow(threadId: string, text: string): Promise<number> {
    const chunks = splitMessage(text, 1900);
    // Part markers so a split reply is recognizable rather than looking like
    // an overwritten/duplicated message.
    const withMarkers = chunks.length > 1
      ? chunks.map((chunk, i) => `(${i + 1}/${chunks.length})\n${chunk}`)
      : chunks;
    let sent = 0;
    for (const [index, chunk] of withMarkers.entries()) {
      if (index > 0 && this.config.announcements.obeyMessengerRateLimits) {
        await delay(1200);
      }
      const accepted = await this.sendWithRetry(threadId, chunk);
      if (!accepted) {
        // Don't silently drop the remaining chunks: tell the user the reply
        // was interrupted so it doesn't look like the bot ignored them.
        await this.sendCooldownNotice(threadId, sent, withMarkers.length);
        break;
      }
      sent += 1;
    }
    return sent;
  }

  public async sendSingle(threadId: string, text: string): Promise<boolean> {
    return this.enqueue(threadId, () => this.sendWithRetry(threadId, text.slice(0, 1900)));
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

  private async sendCooldownNotice(threadId: string, delivered: number, total: number): Promise<void> {
    const cooldownMs = this.config.rateLimiting.antiSpam.maximumDelayMs;
    await delay(cooldownMs);
    const partial = total > 1
      ? ` Only ${delivered}/${total} parts were delivered.`
      : " The response was not delivered.";
    try {
      await this.messenger.sendText(
        threadId,
        // Unique nonce changes the library's send idempotency hash so a repeated
        // rate-limit notice isn't deduped and silently dropped.
        `⏳ Outbound rate limit reached. I paused for ${Math.ceil(cooldownMs / 1000)}s.${partial} Please repeat the command once messaging is available again.\u200B\u200C${Date.now()}`,
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
