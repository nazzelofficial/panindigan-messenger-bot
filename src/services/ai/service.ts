import type { AppConfig, ResolvedSecrets } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { AppLogger } from "../../logging/logger.js";
import type { CooldownService } from "../cooldown/service.js";
import type { AiLevel } from "../../config/index.js";
import { OpenAICompatibleProvider, AiProviderError, type AiProvider } from "./provider.js";
import { randomIdentifier } from "../../utils/crypto.js";
import { formatInteger } from "../../utils/text.js";

export interface AskResult {
  success: boolean;
  text: string;
  level: AiLevel;
  model: string;
  provider: string;
  coinCharge: number;
  refunded: boolean;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
}

const LEVELS: readonly AiLevel[] = ["ask1", "ask2", "ask3", "ask4", "ask5", "ask6"];
const PAID_LEVELS: readonly AiLevel[] = ["ask1", "ask2", "ask3", "ask4", "ask5"];

export class AiService {
  private readonly provider: AiProvider | undefined;
  private readonly activeRequests = new Map<string, AbortController>();

  public constructor(
    private readonly config: AppConfig,
    private readonly secrets: ResolvedSecrets,
    private readonly databases: DatabaseBundle,
    private readonly cooldowns: CooldownService,
    private readonly logger: AppLogger,
  ) {
    if (config.artificialIntelligence.enabled && secrets.aiApiKey && secrets.aiBaseUrl) {
      this.provider = new OpenAICompatibleProvider(
        config.artificialIntelligence.defaultProvider || "openai-compatible",
        secrets.aiBaseUrl,
        secrets.aiApiKey,
      );
    }
  }

  public isConfigured(): boolean {
    return this.provider !== undefined;
  }

  public providerName(): string {
    return this.provider?.displayName ?? "Not configured";
  }

  public defaultModel(): string {
    return (
      this.config.artificialIntelligence.defaultModel ||
      this.secrets.aiDefaultModel ||
      this.secrets.aiFallbackModel ||
      ""
    );
  }

  public modelFor(level: AiLevel): string {
    return process.env[`AI_MODEL_${level.toUpperCase()}`] || this.defaultModel();
  }

  public models(): Array<{ level: AiLevel; model: string; configured: boolean }> {
    return LEVELS.map((level) => ({
      level,
      model: this.modelFor(level),
      configured: this.modelFor(level) !== "",
    }));
  }

  public coinCost(level: AiLevel): number {
    return this.config.artificialIntelligence.coinPrices[level];
  }

  public maximumLength(level: AiLevel): number {
    return this.config.artificialIntelligence.maximumMessageLengths[level];
  }

  public quota(level: AiLevel): { maximumRequests: number; periodHours: number } {
    return this.config.artificialIntelligence.requestQuotas[level];
  }

  public async balance(facebookId: string): Promise<number> {
    if (!this.databases.users || !this.databases.economy)
      throw new Error("PostgreSQL is required for AI accounting.");
    const user = await this.databases.users.upsert(facebookId);
    return this.databases.economy.getBalance(user.id);
  }

  public async ask(
    level: AiLevel,
    facebookId: string,
    text: string,
    eventKey?: string,
  ): Promise<AskResult> {
    const started = Date.now();
    const settings = this.config.artificialIntelligence;
    const provider = this.provider;
    if (!provider) throw new Error("No AI provider is configured.");
    const requestKey = eventKey ?? randomIdentifier("ai");
    const model = this.modelFor(level);
    const charge = this.coinCost(level);

    if (!settings.enabled || !this.provider) {
      throw new Error(
        "No AI provider is configured. Set AI_PROVIDER_API_KEY, AI_PROVIDER_BASE_URL and a model, then restart the bot.",
      );
    }
    if (model === "") throw new Error("No AI model is configured for this command.");
    if (!text.trim()) throw new Error("Provide a message for the AI.");
    if (text.length > this.maximumLength(level)) {
      throw new Error(
        `Your message exceeds the ${formatInteger(this.maximumLength(level))}-character limit for ${level}.`,
      );
    }
    if (!this.databases.users || !this.databases.economy || !this.databases.ai) {
      throw new Error("PostgreSQL is required for AI usage accounting.");
    }

    const user = await this.databases.users.upsert(facebookId);
    const userId = user.id;
    if (PAID_LEVELS.includes(level)) {
      const balance = await this.databases.economy.getBalance(userId);
      if (balance < charge) {
        throw new Error(
          `You need ${formatInteger(charge)} ${this.config.economy.currencyLabel} to use ${level}. Your balance is ${formatInteger(balance)}.`,
        );
      }
      const quota = this.quota(level);
      const periodStart = this.periodStart(quota.periodHours);
      const used = await this.databases.ai.countInPeriod(userId, level, periodStart);
      if (used >= quota.maximumRequests) {
        throw new Error(`You have reached the ${level} usage limit for this period.`);
      }
    }

    if (!this.databases.redis || !this.databases.cooldowns) {
      throw new Error("Redis is required for AI request coordination.");
    }
    const dedupeKey = this.databases.redis.keys.aiDedupe(requestKey);
    if (!(await this.databases.cooldowns.acquire(dedupeKey, 10 * 60_000))) {
      return {
        success: false,
        text: "This request was already received. Please wait for the original response.",
        level,
        model,
        provider: provider.id,
        coinCharge: 0,
        refunded: false,
        durationMs: Date.now() - started,
      };
    }
    if (await this.databases.ai.isCancelled(requestKey)) {
      throw new Error("This AI request was cancelled.");
    }
    const globalKey = this.databases.redis.keys.aiConcurrency("global");
    const userKey = this.databases.redis.keys.aiConcurrency(facebookId);
    const globalCount = await this.databases.redis.raw().incr(globalKey);
    const userCount = await this.databases.redis.raw().incr(userKey);
    await this.databases.redis.expire(globalKey, 120_000);
    await this.databases.redis.expire(userKey, 120_000);
    if (globalCount > settings.maximumConcurrentRequests || userCount > 2) {
      await this.databases.redis.raw().decr(globalKey);
      await this.databases.redis.raw().decr(userKey);
      await this.databases.redis.delete(dedupeKey);
      throw new Error("The AI service is busy. Please try again in a moment.");
    }

    const controller = new AbortController();
    this.activeRequests.set(requestKey, controller);
    let reserved = false;
    let refunded = false;
    try {
      if (charge > 0) {
        await this.databases.economy.applyTransaction({
          userId,
          amount: -charge,
          type: `ai_${level}`,
          description: `${level} AI request`,
          idempotencyKey: `ai:${requestKey}`,
          referenceId: requestKey,
        });
        reserved = true;
      }
      const completion = await provider.chat({
        model,
        timeoutMs: settings.requestTimeoutMs,
        signal: controller.signal,
        messages: [
          {
            role: "system",
            content:
              "You are Panindigan Bot's assistant. Answer clearly and concisely for a Messenger chat audience.",
          },
          { role: "user", content: text },
        ],
      });
      if (settings.recordUsage) {
        if (PAID_LEVELS.includes(level)) {
          await this.databases.ai.incrementQuota(
            userId,
            level,
            this.periodStart(this.quota(level).periodHours),
          );
        }
        await this.databases.ai.recordUsage({
          userId,
          level,
          provider: provider.id,
          model: completion.model,
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
          usageMetadata: completion.rawUsage,
          coinCharge: charge,
          refundStatus: charge > 0 ? "none" : "not_applicable",
          success: true,
          durationMs: Date.now() - started,
          idempotencyKey: requestKey,
        });
      }
      await this.databases.operational?.recordActivity("ai", level, {
        userId: facebookId,
        model: completion.model,
        success: true,
      });
      return {
        success: true,
        text: completion.text,
        level,
        model: completion.model,
        provider: this.provider.id,
        coinCharge: charge,
        refunded: false,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      // Consistent published policy: any request that does not yield a response
      // is fully refunded, including provider-side failures.
      if (reserved && charge > 0) {
        await this.databases.economy.applyTransaction({
          userId,
          amount: charge,
          type: `ai_refund_${level}`,
          description: `Refund for failed ${level} request`,
          idempotencyKey: `ai:refund:${requestKey}`,
          referenceId: requestKey,
        });
        refunded = true;
      }
      if (settings.recordUsage) {
        await this.databases.ai.recordUsage({
          userId,
          level,
          provider: provider.id,
          model,
          coinCharge: charge,
          refundStatus: reserved && charge > 0 ? "full" : "not_applicable",
          success: false,
          failureReason: error instanceof Error ? error.message.slice(0, 500) : "Provider failure",
          durationMs: Date.now() - started,
          idempotencyKey: requestKey,
        });
      }
      const detail =
        error instanceof AiProviderError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error";
      this.logger.warn({ level, model, error: detail }, "AI request failed and was refunded");
      throw new Error(
        `${detail}\n${charge > 0 && refunded ? `${formatInteger(charge)} ${this.config.economy.currencyLabel} were refunded.` : "No coins were charged."}`,
        { cause: error },
      );
    } finally {
      this.activeRequests.delete(requestKey);
      await this.databases.redis
        .raw()
        .decr(globalKey)
        .catch(() => undefined);
      await this.databases.redis
        .raw()
        .decr(userKey)
        .catch(() => undefined);
    }
  }

  public async cancel(requestKey: string, facebookId: string): Promise<boolean> {
    const controller = this.activeRequests.get(requestKey);
    if (!controller) return false;
    if (this.databases.ai && this.databases.users) {
      const user = await this.databases.users.upsert(facebookId);
      await this.databases.ai.requestCancellation(requestKey, user.id);
    }
    controller.abort();
    this.logger.info({ facebookId, requestKey }, "AI request cancelled by user");
    return true;
  }

  public async usage(facebookId: string, limit = 10): Promise<unknown[]> {
    if (!this.databases.users || !this.databases.ai)
      throw new Error("PostgreSQL is required for AI usage records.");
    const user = await this.databases.users.upsert(facebookId);
    return this.databases.ai.usage(user.id, limit);
  }

  public async totalSpent(facebookId: string): Promise<number> {
    if (!this.databases.users || !this.databases.ai)
      throw new Error("PostgreSQL is required for AI accounting.");
    const user = await this.databases.users.upsert(facebookId);
    return this.databases.ai.totalSpent(user.id);
  }

  public top(limit = 10) {
    if (!this.databases.ai) throw new Error("PostgreSQL is required for AI usage records.");
    return this.databases.ai.topUsers(limit);
  }

  public async feedback(facebookId: string, rating: number, comment: string): Promise<void> {
    if (!this.databases.users || !this.databases.ai)
      throw new Error("PostgreSQL is required for AI feedback.");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new Error("Rating must be an integer from 1 to 5.");
    const user = await this.databases.users.upsert(facebookId);
    const usageId = await this.databases.ai.lastUsageId(user.id);
    if (!usageId) throw new Error("There is no previous AI response to rate.");
    await this.databases.ai.addFeedback(usageId, user.id, rating, comment);
  }

  private periodStart(periodHours: number): Date {
    if (periodHours <= 0) return new Date(0);
    const window = periodHours * 3_600_000;
    return new Date(Math.floor(Date.now() / window) * window);
  }
}
