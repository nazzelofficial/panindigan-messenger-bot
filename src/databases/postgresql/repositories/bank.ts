import type { PostgresClient } from "../client.js";

/** Wallet and vault both live in PostgreSQL; transfers between them are atomic. */
export class BankRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async balance(userId: number): Promise<number> {
    const result = await this.db.query<{ balance: string }>(
      "SELECT balance FROM bank_accounts WHERE user_id = $1",
      [userId],
    );
    return Number(result.rows[0]?.balance ?? 0);
  }

  public async transfer(
    userId: number,
    amount: number,
    direction: "deposit" | "withdraw",
    key: string,
  ): Promise<{ wallet: number; bank: number }> {
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new Error("Amount must be a positive whole number.");
    return this.db.transaction(async (connection) => {
      await connection.query("SELECT pg_advisory_xact_lock($1)", [userId]);
      const duplicate = await connection.query(
        "SELECT 1 FROM bank_transactions WHERE idempotency_key = $1",
        [key],
      );
      if (duplicate.rowCount) throw new Error("This bank transfer has already been processed.");
      await connection.query(
        "INSERT INTO coin_accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [userId],
      );
      await connection.query(
        "INSERT INTO bank_accounts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [userId],
      );
      const wallets = await connection.query<{ balance: string }>(
        "SELECT balance FROM coin_accounts WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      const banks = await connection.query<{ balance: string }>(
        "SELECT balance FROM bank_accounts WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      const wallet = Number(wallets.rows[0]!.balance);
      const bank = Number(banks.rows[0]!.balance);
      if (direction === "deposit" && wallet < amount)
        throw new Error("Insufficient wallet balance.");
      if (direction === "withdraw" && bank < amount) throw new Error("Insufficient bank balance.");
      const nextWallet = direction === "deposit" ? wallet - amount : wallet + amount;
      const nextBank = direction === "deposit" ? bank + amount : bank - amount;
      await connection.query(
        "UPDATE coin_accounts SET balance = $2, updated_at = NOW() WHERE user_id = $1",
        [userId, nextWallet],
      );
      await connection.query(
        "UPDATE bank_accounts SET balance = $2, updated_at = NOW() WHERE user_id = $1",
        [userId, nextBank],
      );
      await connection.query(
        "INSERT INTO bank_transactions (user_id, direction, amount, idempotency_key) VALUES ($1, $2, $3, $4)",
        [userId, direction, amount, key],
      );
      await connection.query(
        `INSERT INTO coin_transactions (user_id, amount, transaction_type, description, idempotency_key)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          direction === "deposit" ? -amount : amount,
          `bank_${direction}`,
          `Bank ${direction}`,
          `bank:${key}`,
        ],
      );
      return { wallet: nextWallet, bank: nextBank };
    });
  }
}
