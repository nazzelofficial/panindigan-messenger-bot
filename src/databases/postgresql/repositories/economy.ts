import type { PostgresClient } from "../client.js";

export interface AccountRow {
  user_id: number;
  balance: string;
  lifetime_earned: string;
  lifetime_spent: string;
}

export class EconomyRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async ensureAccount(userId: number): Promise<AccountRow> {
    const result = await this.db.query<AccountRow>(
      `INSERT INTO coin_accounts (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING user_id, balance, lifetime_earned, lifetime_spent`,
      [userId],
    );
    if (result.rows[0]) return result.rows[0];
    const existing = await this.db.query<AccountRow>(
      "SELECT user_id, balance, lifetime_earned, lifetime_spent FROM coin_accounts WHERE user_id = $1",
      [userId],
    );
    return existing.rows[0]!;
  }

  public async getBalance(userId: number): Promise<number> {
    const account = await this.ensureAccount(userId);
    return Number(account.balance);
  }

  /**
   * Atomically applies a balance change. `idempotencyKey` makes retries and
   * duplicate Messenger events safe: a repeated key returns the first result.
   */
  public async applyTransaction(input: {
    userId: number;
    amount: number;
    type: string;
    description: string;
    idempotencyKey: string;
    referenceId?: string;
  }): Promise<{ balance: number; applied: boolean }> {
    return this.db.transaction(async (connection) => {
      const duplicate = await connection.query<{ balance: string }>(
        "SELECT a.balance::text AS balance FROM coin_transactions t JOIN coin_accounts a ON a.user_id = t.user_id WHERE t.idempotency_key = $1",
        [input.idempotencyKey],
      );
      if (duplicate.rows[0]) return { balance: Number(duplicate.rows[0].balance), applied: false };

      await connection.query(
        "INSERT INTO coin_accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [input.userId],
      );
      const account = await connection.query<{ balance: string }>(
        "SELECT balance FROM coin_accounts WHERE user_id = $1 FOR UPDATE",
        [input.userId],
      );
      const current = Number(account.rows[0]!.balance);
      const next = current + input.amount;
      if (next < 0) throw new Error("Insufficient balance.");
      await connection.query(
        `UPDATE coin_accounts
            SET balance = $2,
                lifetime_earned = lifetime_earned + $3,
                lifetime_spent = lifetime_spent + $4,
                updated_at = NOW()
          WHERE user_id = $1`,
        [input.userId, next, Math.max(input.amount, 0), Math.max(-input.amount, 0)],
      );
      await connection.query(
        `INSERT INTO coin_transactions (user_id, amount, transaction_type, reference_id, description, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          input.userId,
          input.amount,
          input.type,
          input.referenceId ?? null,
          input.description,
          input.idempotencyKey,
        ],
      );
      return { balance: next, applied: true };
    });
  }

  public async claimReward(input: {
    userId: number;
    rewardType: string;
    period: string;
    amount: number;
    nextEligibleAt: Date;
    idempotencyKey: string;
  }): Promise<{ claimed: boolean; balance: number; nextEligibleAt?: number }> {
    return this.db.transaction(async (connection) => {
      // Serialize all reward activity for this user for the life of the
      // transaction; two concurrent claims can never both pass the check.
      await connection.query("SELECT pg_advisory_xact_lock($1)", [input.userId]);
      const duplicate = await connection.query(
        "SELECT 1 FROM coin_transactions WHERE idempotency_key = $1",
        [input.idempotencyKey],
      );
      if (duplicate.rowCount) {
        const balance = await connection.query<{ balance: string }>(
          "SELECT balance FROM coin_accounts WHERE user_id = $1",
          [input.userId],
        );
        return { claimed: false, balance: Number(balance.rows[0]?.balance ?? 0) };
      }
      const priorClaim = await connection.query<{
        next_eligible_at: Date;
        idempotency_key: string;
      }>(
        `SELECT next_eligible_at, idempotency_key FROM reward_claims
          WHERE user_id = $1 AND reward_type = $2 AND reward_period = $3`,
        [input.userId, input.rewardType, input.period],
      );
      const prior = priorClaim.rows[0];
      if (prior && prior.next_eligible_at.getTime() > Date.now()) {
        const balance = await connection.query<{ balance: string }>(
          "SELECT balance FROM coin_accounts WHERE user_id = $1",
          [input.userId],
        );
        return {
          claimed: false,
          balance: Number(balance.rows[0]?.balance ?? 0),
          nextEligibleAt: prior.next_eligible_at.getTime(),
        };
      }
      await connection.query(
        "INSERT INTO coin_accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [input.userId],
      );
      const account = await connection.query<{ balance: string }>(
        "SELECT balance FROM coin_accounts WHERE user_id = $1 FOR UPDATE",
        [input.userId],
      );
      const next = Number(account.rows[0]!.balance) + input.amount;
      await connection.query(
        "UPDATE coin_accounts SET balance = $2, lifetime_earned = lifetime_earned + $2, updated_at = NOW() WHERE user_id = $1",
        [input.userId, input.amount],
      );
      await connection.query(
        `INSERT INTO coin_transactions (user_id, amount, transaction_type, description, idempotency_key)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          input.userId,
          input.amount,
          `reward_${input.rewardType}`,
          `${input.rewardType} reward`,
          input.idempotencyKey,
        ],
      );
      await connection.query(
        `INSERT INTO reward_claims (user_id, reward_type, reward_period, amount, next_eligible_at, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, reward_type, reward_period) DO UPDATE
           SET amount = EXCLUDED.amount, next_eligible_at = EXCLUDED.next_eligible_at,
               claimed_at = NOW(), idempotency_key = EXCLUDED.idempotency_key`,
        [
          input.userId,
          input.rewardType,
          input.period,
          input.amount,
          input.nextEligibleAt,
          input.idempotencyKey,
        ],
      );
      return { claimed: true, balance: next, nextEligibleAt: input.nextEligibleAt.getTime() };
    });
  }

  public async nextEligible(userId: number, rewardType: string): Promise<number | undefined> {
    const result = await this.db.query<{ next_eligible_at: Date }>(
      `SELECT next_eligible_at FROM reward_claims
        WHERE user_id = $1 AND reward_type = $2 AND next_eligible_at > NOW()
        ORDER BY next_eligible_at DESC LIMIT 1`,
      [userId, rewardType],
    );
    return result.rows[0]?.next_eligible_at.getTime();
  }

  public async transfer(input: {
    fromUserId: number;
    toUserId: number;
    amount: number;
    idempotencyKey: string;
  }): Promise<number> {
    return this.db.transaction(async (connection) => {
      const duplicate = await connection.query(
        "SELECT 1 FROM coin_transactions WHERE idempotency_key = $1",
        [input.idempotencyKey],
      );
      if (duplicate.rowCount) {
        throw new Error("This transfer has already been processed.");
      }
      await connection.query(
        "INSERT INTO coin_accounts (user_id) VALUES ($1), ($2) ON CONFLICT (user_id) DO NOTHING",
        [input.fromUserId, input.toUserId],
      );
      const source = await connection.query<{ balance: string }>(
        "SELECT balance FROM coin_accounts WHERE user_id = $1 FOR UPDATE",
        [input.fromUserId],
      );
      if (Number(source.rows[0]!.balance) < input.amount) throw new Error("Insufficient balance.");
      await connection.query(
        "UPDATE coin_accounts SET balance = balance - $2, lifetime_spent = lifetime_spent + $2 WHERE user_id = $1",
        [input.fromUserId, input.amount],
      );
      await connection.query(
        "UPDATE coin_accounts SET balance = balance + $2, lifetime_earned = lifetime_earned + $2 WHERE user_id = $1",
        [input.toUserId, input.amount],
      );
      await connection.query(
        `INSERT INTO coin_transactions (user_id, amount, transaction_type, description, idempotency_key)
         VALUES ($1, $2, 'transfer_out', 'Transfer sent', $3), ($4, $5, 'transfer_in', 'Transfer received', $6)`,
        [
          input.fromUserId,
          -input.amount,
          `${input.idempotencyKey}:out`,
          input.toUserId,
          input.amount,
          `${input.idempotencyKey}:in`,
        ],
      );
      return Number(source.rows[0]!.balance) - input.amount;
    });
  }

  public async history(userId: number, limit = 20): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT amount, transaction_type, description, created_at FROM coin_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
      [userId, limit],
    );
    return result.rows;
  }

  public async leaderboard(limit = 10): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT u.facebook_id, a.balance FROM coin_accounts a
        JOIN bot_users u ON u.id = a.user_id
       ORDER BY a.balance DESC LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  public async addShopItem(name: string, description: string, price: number): Promise<void> {
    await this.db.query(
      "INSERT INTO shop_items (name, description, price) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, price = EXCLUDED.price, active = TRUE",
      [name, description, price],
    );
  }

  public async listShopItems(): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT id, name, description, price FROM shop_items WHERE active = TRUE ORDER BY price",
    );
    return result.rows;
  }

  public async buyItem(userId: number, itemId: number, idempotencyKey: string): Promise<void> {
    await this.db.transaction(async (connection) => {
      await connection.query("SELECT pg_advisory_xact_lock($1)", [userId]);
      const duplicate = await connection.query(
        "SELECT 1 FROM coin_transactions WHERE idempotency_key = $1",
        [idempotencyKey],
      );
      if (duplicate.rowCount) return;
      const item = await connection.query<{ price: string; name: string }>(
        "SELECT price, name FROM shop_items WHERE id = $1 AND active = TRUE",
        [itemId],
      );
      const product = item.rows[0];
      if (!product) throw new Error("That item is not available.");
      const account = await connection.query<{ balance: string }>(
        "SELECT balance FROM coin_accounts WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      if (Number(account.rows[0]?.balance ?? 0) < Number(product.price)) {
        throw new Error("Insufficient balance.");
      }
      await connection.query(
        "UPDATE coin_accounts SET balance = balance - $2, lifetime_spent = lifetime_spent + $2 WHERE user_id = $1",
        [userId, Number(product.price)],
      );
      await connection.query(
        `INSERT INTO coin_transactions (user_id, amount, transaction_type, description, idempotency_key)
         VALUES ($1, $2, 'shop_purchase', $3, $4)`,
        [userId, -Number(product.price), `Purchased ${product.name}`, idempotencyKey],
      );
      await connection.query(
        `INSERT INTO inventory_items (user_id, item_id, quantity) VALUES ($1, $2, 1)
         ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = quantity + 1, updated_at = NOW()`,
        [userId, itemId],
      );
    });
  }

  public async inventory(userId: number): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT s.name, i.quantity FROM inventory_items i JOIN shop_items s ON s.id = i.item_id
        WHERE i.user_id = $1 AND i.quantity > 0 ORDER BY s.name`,
      [userId],
    );
    return result.rows;
  }

  public async sellItem(userId: number, itemId: number, idempotencyKey: string): Promise<number> {
    return this.db.transaction(async (connection) => {
      await connection.query("SELECT pg_advisory_xact_lock($1)", [userId]);
      const duplicate = await connection.query(
        "SELECT 1 FROM coin_transactions WHERE idempotency_key = $1",
        [idempotencyKey],
      );
      if (duplicate.rowCount) throw new Error("This sale has already been processed.");
      const item = await connection.query<{ price: string; name: string }>(
        "SELECT price, name FROM shop_items WHERE id = $1 AND active = TRUE",
        [itemId],
      );
      const product = item.rows[0];
      if (!product) throw new Error("That item is not available.");
      const owned = await connection.query<{ quantity: string }>(
        "SELECT quantity FROM inventory_items WHERE user_id = $1 AND item_id = $2 FOR UPDATE",
        [userId, itemId],
      );
      if (Number(owned.rows[0]?.quantity ?? 0) < 1) throw new Error("You do not own that item.");
      const refund = Math.floor(Number(product.price) / 2);
      await connection.query(
        "UPDATE inventory_items SET quantity = quantity - 1, updated_at = NOW() WHERE user_id = $1 AND item_id = $2",
        [userId, itemId],
      );
      await connection.query(
        "UPDATE coin_accounts SET balance = balance + $2, lifetime_earned = lifetime_earned + $2 WHERE user_id = $1",
        [userId, refund],
      );
      await connection.query(
        `INSERT INTO coin_transactions (user_id, amount, transaction_type, description, idempotency_key)
         VALUES ($1, $2, 'shop_sale', $3, $4)`,
        [userId, refund, `Sold ${product.name}`, idempotencyKey],
      );
      return refund;
    });
  }

  public async useItem(userId: number, itemId: number): Promise<string> {
    return this.db.transaction(async (connection) => {
      await connection.query("SELECT pg_advisory_xact_lock($1)", [userId]);
      const item = await connection.query<{ name: string }>(
        "SELECT name FROM shop_items WHERE id = $1 AND active = TRUE",
        [itemId],
      );
      const product = item.rows[0];
      if (!product) throw new Error("That item is not available.");
      const owned = await connection.query<{ quantity: string }>(
        "SELECT quantity FROM inventory_items WHERE user_id = $1 AND item_id = $2 FOR UPDATE",
        [userId, itemId],
      );
      if (Number(owned.rows[0]?.quantity ?? 0) < 1) throw new Error("You do not own that item.");
      await connection.query(
        "UPDATE inventory_items SET quantity = quantity - 1, updated_at = NOW() WHERE user_id = $1 AND item_id = $2",
        [userId, itemId],
      );
      return product.name;
    });
  }

  public async recordAudit(
    actor: string | undefined,
    target: string,
    action: string,
    details: unknown,
  ): Promise<void> {
    await this.db.query(
      "INSERT INTO economy_audit (actor_id, target_id, action, details) VALUES ($1, $2, $3, $4::jsonb)",
      [actor ?? null, target, action, JSON.stringify(details)],
    );
  }
}
