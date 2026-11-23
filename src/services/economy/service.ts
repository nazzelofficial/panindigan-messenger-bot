import type { AppConfig } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { AppLogger } from "../../logging/logger.js";
import type { CooldownService } from "../cooldown/service.js";
import { randomIdentifier, randomInt } from "../../utils/crypto.js";
import { formatDateTime, formatDuration } from "../../utils/time.js";
import { formatInteger } from "../../utils/text.js";

export type RewardType = "daily" | "weekly" | "monthly" | "work" | "beg";

export interface RewardResult {
  success: boolean;
  amount: number;
  balance: number;
  nextEligibleAt?: number;
  message: string;
}

export class EconomyService {
  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
    private readonly cooldowns: CooldownService,
    private readonly logger: AppLogger,
  ) {}

  private assert(): NonNullable<DatabaseBundle["economy"]> {
    if (!this.config.economy.enabled) throw new Error("The economy module is disabled.");
    if (!this.databases.economy || !this.databases.users)
      throw new Error("PostgreSQL is required for the economy.");
    return this.databases.economy;
  }

  private async userId(facebookId: string): Promise<number> {
    return (await this.databases.users!.upsert(facebookId)).id;
  }

  private currency(amount: number): string {
    return `${formatInteger(amount)} ${this.config.economy.currencyLabel}`;
  }

  public async balance(facebookId: string): Promise<number> {
    return this.assert().getBalance(await this.userId(facebookId));
  }

  public async claim(
    facebookId: string,
    type: RewardType,
    eventKey?: string,
  ): Promise<RewardResult> {
    const repository = this.assert();
    const userId = await this.userId(facebookId);
    const { rewards, activities } = this.config.economy;

    if (type === "work" || type === "beg") {
      const activity = type === "work" ? activities.work : activities.beg;
      if (!activity.enabled)
        return { success: false, amount: 0, balance: 0, message: "That activity is disabled." };
      const cooldownMs =
        type === "work"
          ? activities.work.cooldownMinutes * 60_000
          : activities.beg.cooldownHours * 3_600_000;
      const key =
        this.databases.redis?.keys.cooldown("user", facebookId, type) ??
        `activity:${facebookId}:${type}`;
      const lock = await this.cooldowns.acquire(key, cooldownMs);
      if (!lock.allowed) {
        return {
          success: false,
          amount: 0,
          balance: await repository.getBalance(userId),
          nextEligibleAt: Date.now() + lock.remainingMs,
          message: `You can ${type} again in ${formatDuration(lock.remainingMs)}.`,
        };
      }
      const amount = randomInt(activity.minimumPayout, activity.maximumPayout);
      const result = await repository.applyTransaction({
        userId,
        amount,
        type: `activity_${type}`,
        description: `${type} payout`,
        idempotencyKey: eventKey ?? randomIdentifier("activity"),
      });
      return {
        success: true,
        amount,
        balance: result.balance,
        nextEligibleAt: Date.now() + cooldownMs,
        message: `You earned ${this.currency(amount)} from ${type === "work" ? "working" : "begging"}.\nBalance: ${this.currency(result.balance)}`,
      };
    }

    const daily = type === "daily" ? rewards.daily : undefined;
    const weekly = type === "weekly" ? rewards.weekly : undefined;
    const monthly = type === "monthly" ? rewards.monthly : undefined;
    const reward = daily ?? weekly ?? monthly;
    if (!reward || !reward.enabled) {
      return { success: false, amount: 0, balance: 0, message: "That reward is disabled." };
    }
    const cooldownMs =
      "cooldownHours" in reward ? reward.cooldownHours * 3_600_000 : 30 * 86_400_000;
    const redisKey =
      this.databases.redis?.keys.rewardLock(facebookId, type) ?? `reward:${facebookId}:${type}`;
    const lock = await this.cooldowns.acquire(redisKey, cooldownMs);
    if (!lock.allowed) {
      const next = await repository.nextEligible(userId, type);
      return {
        success: false,
        amount: 0,
        balance: await repository.getBalance(userId),
        nextEligibleAt: next ?? Date.now() + lock.remainingMs,
        message: `You can claim your ${type} reward again in ${formatDuration(lock.remainingMs)}.`,
      };
    }

    let amount = reward.amount;
    let period = "standard";
    if (daily?.streakBonusEnabled) amount += await this.applyStreakBonus(facebookId);
    if (monthly?.resetPolicy === "calendarMonth") {
      period = new Intl.DateTimeFormat("en-CA", {
        timeZone: this.config.application.timezone,
        year: "numeric",
        month: "2-digit",
      }).format(new Date());
    }

    const result = await repository.claimReward({
      userId,
      rewardType: type,
      period,
      amount,
      nextEligibleAt: new Date(Date.now() + cooldownMs),
      idempotencyKey: eventKey ?? randomIdentifier("reward"),
    });
    if (!result.claimed) {
      return {
        success: false,
        amount: 0,
        balance: result.balance,
        nextEligibleAt: result.nextEligibleAt,
        message: `You can claim your ${type} reward again ${
          result.nextEligibleAt
            ? `on ${formatDateTime(result.nextEligibleAt, this.config.application.timezone)}`
            : "later"
        }.`,
      };
    }
    const nextText = result.nextEligibleAt
      ? `Next claim: ${formatDateTime(result.nextEligibleAt, this.config.application.timezone)}`
      : "";
    return {
      success: true,
      amount,
      balance: result.balance,
      nextEligibleAt: result.nextEligibleAt,
      message: `🎁 ${type.toUpperCase()} REWARD\nYou received ${this.currency(amount)}!\n\nBalance: ${this.currency(result.balance)}\n${nextText}`,
    };
  }

  private async applyStreakBonus(facebookId: string): Promise<number> {
    if (!this.databases.users) return 0;
    const user = await this.databases.users.find(facebookId);
    if (!user) return 0;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.config.application.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const previous = await this.databases.users.getPreference<{ streak: number; lastDate: string }>(
      user.id,
      "daily_streak",
    );
    const consecutive =
      previous?.lastDate === today
        ? previous.streak
        : yesterdayIs(previous?.lastDate, today)
          ? previous!.streak + 1
          : 1;
    await this.databases.users.setPreference(user.id, "daily_streak", {
      streak: consecutive,
      lastDate: today,
    });
    return Math.min(consecutive - 1, 10);
  }

  public async transfer(
    from: string,
    to: string,
    amount: number,
    idempotencyKey?: string,
  ): Promise<number> {
    if (!Number.isInteger(amount) || amount <= 0)
      throw new Error("Transfer amount must be a positive whole number.");
    const repository = this.assert();
    const fromId = await this.userId(from);
    const toId = await this.userId(to);
    if (fromId === toId) throw new Error("You cannot transfer coins to yourself.");
    return repository.transfer({
      fromUserId: fromId,
      toUserId: toId,
      amount,
      idempotencyKey: idempotencyKey ?? randomIdentifier("transfer"),
    });
  }

  public async setCoins(actor: string, target: string, amount: number): Promise<number> {
    if (!Number.isInteger(amount) || amount < 0)
      throw new Error("Balance must be a non-negative whole number.");
    const repository = this.assert();
    const targetId = await this.userId(target);
    const current = await repository.getBalance(targetId);
    const difference = amount - current;
    const result = await repository.applyTransaction({
      userId: targetId,
      amount: difference,
      type: "administrative_adjustment",
      description: `Balance set to ${amount} by ${actor}`,
      idempotencyKey: randomIdentifier("adjust"),
    });
    await repository.recordAudit(actor, target, "set_coins", { previous: current, next: amount });
    this.logger.warn({ actor, target, amount }, "Administrative coin adjustment");
    return result.balance;
  }

  public async history(facebookId: string, limit = 15): Promise<unknown[]> {
    const userId = await this.userId(facebookId);
    return this.assert().history(userId, limit);
  }

  public leaderboard(limit = 10) {
    return this.assert().leaderboard(limit);
  }

  public async addShopItem(name: string, description: string, price: number): Promise<void> {
    await this.assert().addShopItem(name, description, price);
  }

  public shopItems() {
    return this.assert().listShopItems();
  }

  public async buy(facebookId: string, itemId: number, eventKey?: string): Promise<void> {
    await this.assert().buyItem(
      await this.userId(facebookId),
      itemId,
      eventKey ?? randomIdentifier("purchase"),
    );
  }

  public async inventory(facebookId: string) {
    return this.assert().inventory(await this.userId(facebookId));
  }

  public async sellItem(facebookId: string, itemId: number, key?: string): Promise<number> {
    if (!this.databases.economy) throw new Error("PostgreSQL is required for the shop.");
    return this.databases.economy.sellItem(
      await this.userId(facebookId),
      itemId,
      key ?? randomIdentifier("sale"),
    );
  }

  public async useItem(facebookId: string, itemId: number): Promise<string> {
    if (!this.databases.economy) throw new Error("PostgreSQL is required for the shop.");
    return this.databases.economy.useItem(await this.userId(facebookId), itemId);
  }

  public async bankBalance(facebookId: string): Promise<number> {
    if (!this.databases.bank) throw new Error("PostgreSQL is required for bank operations.");
    return this.databases.bank.balance(await this.userId(facebookId));
  }

  public async deposit(facebookId: string, amount: number, key?: string) {
    if (!this.databases.bank) throw new Error("PostgreSQL is required for bank operations.");
    return this.databases.bank.transfer(
      await this.userId(facebookId),
      amount,
      "deposit",
      key ?? randomIdentifier("deposit"),
    );
  }

  public async withdraw(facebookId: string, amount: number, key?: string) {
    if (!this.databases.bank) throw new Error("PostgreSQL is required for bank operations.");
    return this.databases.bank.transfer(
      await this.userId(facebookId),
      amount,
      "withdraw",
      key ?? randomIdentifier("withdraw"),
    );
  }

  public format(value: number): string {
    return this.currency(value);
  }
}

function yesterdayIs(previous: string | undefined, today: string): boolean {
  if (!previous) return false;
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10) === previous;
}
