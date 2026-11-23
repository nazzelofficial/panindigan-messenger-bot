import type { LevelingRepository } from "../../databases/postgresql/repositories/leveling.js";
import type { UserRepository } from "../../databases/postgresql/repositories/core.js";
import { levelFromXp } from "../../databases/postgresql/repositories/leveling.js";

/** Accepts either a Facebook ID or a resolved numeric database user id. */
export type UserReference = string | number;

export class LevelingService {
  public constructor(
    private readonly levels: LevelingRepository | undefined,
    private readonly users: UserRepository | undefined,
  ) {}

  public levelFromXp(xp: number): number {
    return levelFromXp(xp);
  }

  private async resolve(reference: UserReference): Promise<number> {
    if (typeof reference === "number") return reference;
    if (!this.users) throw new Error("PostgreSQL is required for leveling.");
    return (await this.users.upsert(reference)).id;
  }

  public async get(reference: UserReference) {
    if (!this.levels) throw new Error("PostgreSQL is required for leveling.");
    return this.levels.get(await this.resolve(reference));
  }

  public async addXp(reference: UserReference, amount: number) {
    if (!this.levels) throw new Error("PostgreSQL is required for leveling.");
    return this.levels.addXp(await this.resolve(reference), amount);
  }

  public async setXp(reference: UserReference, xp: number): Promise<void> {
    if (!this.levels) throw new Error("PostgreSQL is required for leveling.");
    await this.levels.setXp(await this.resolve(reference), xp);
  }

  public async top(limit = 10) {
    if (!this.levels) throw new Error("PostgreSQL is required for leveling.");
    return this.levels.top(limit);
  }

  public async addBoost(
    reference: UserReference,
    multiplier: number,
    expiresAt: Date,
  ): Promise<void> {
    if (!this.levels) throw new Error("PostgreSQL is required for leveling.");
    await this.levels.addBoost(await this.resolve(reference), multiplier, expiresAt);
  }

  public async removeBoosts(reference: UserReference): Promise<number> {
    if (!this.levels) throw new Error("PostgreSQL is required for leveling.");
    return this.levels.removeBoosts(await this.resolve(reference));
  }
}

export { levelFromXp };
