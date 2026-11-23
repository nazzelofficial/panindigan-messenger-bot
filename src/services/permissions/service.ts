import type { AppConfig } from "../../config/index.js";
import type {
  UserRepository,
  AuditRepository,
} from "../../databases/postgresql/repositories/core.js";
import type { AppLogger } from "../../logging/logger.js";
import type { PermissionLevel } from "../../commands/types.js";
import { normalizeAccountId } from "../../utils/env.js";

export interface AllowlistResult {
  allowed: boolean;
  reason: string;
  kind?: "user" | "group";
}

/** Single source of truth for owner, administrator and allowlist decisions. */
export class PermissionsService {
  private readonly owners = new Set<string>();
  private readonly administrators = new Set<string>();

  public constructor(
    private readonly config: AppConfig,
    private readonly users: UserRepository | undefined,
    private readonly audit: AuditRepository | undefined,
    private readonly logger: AppLogger,
  ) {
    for (const id of config.messenger.accountAccess.ownerIds)
      this.owners.add(normalizeAccountId(id));
    for (const id of config.messenger.accountAccess.administratorIds)
      this.administrators.add(normalizeAccountId(id));
  }

  public async hydrate(): Promise<void> {
    if (!this.users) return;
    for (const id of await this.users.listByRole("owner")) this.owners.add(id);
    for (const id of await this.users.listByRole("admin")) this.administrators.add(id);
    this.logger.info(
      { owners: this.owners.size, administrators: this.administrators.size },
      "Roles hydrated",
    );
  }

  public isOwner(userId: string): boolean {
    if (this.owners.size === 0) return false;
    return this.owners.has(normalizeAccountId(userId));
  }

  public isAdmin(userId: string): boolean {
    if (this.administrators.size === 0) return false;
    return this.administrators.has(normalizeAccountId(userId));
  }

  public hasPermission(userId: string, level: PermissionLevel): boolean {
    if (level === "public") return true;
    if (level === "owner") return this.isOwner(userId);
    return this.isAdmin(userId) || this.isOwner(userId);
  }

  public checkAllowlists(userId: string, threadId: string): AllowlistResult {
    const { userAllowlist, groupAllowlist, requireBothListsWhenBothEnabled } =
      this.config.permissions;
    const userOk =
      !userAllowlist.enabled ||
      userAllowlist.userIds.map(normalizeAccountId).includes(normalizeAccountId(userId));
    const groupOk =
      !groupAllowlist.enabled ||
      groupAllowlist.groupIds.map(normalizeAccountId).includes(normalizeAccountId(threadId));
    if (userAllowlist.enabled && groupAllowlist.enabled && requireBothListsWhenBothEnabled) {
      return userOk && groupOk
        ? { allowed: true, reason: "" }
        : {
            allowed: false,
            reason: "This account or group is not on the allowed access lists.",
            kind: userOk ? "group" : "user",
          };
    }
    if (userAllowlist.enabled && !userOk) {
      return { allowed: false, reason: "This account is not on the user allowlist.", kind: "user" };
    }
    if (groupAllowlist.enabled && !groupOk) {
      return { allowed: false, reason: "This group is not on the group allowlist.", kind: "group" };
    }
    return { allowed: true, reason: "" };
  }

  public async ensureUser(userId: string, displayName?: string): Promise<void> {
    if (!this.users) return;
    await this.users.upsert(normalizeAccountId(userId), displayName);
  }

  public async setRole(
    actor: string,
    target: string,
    role: "owner" | "admin",
    value: boolean,
  ): Promise<void> {
    if (!this.isOwner(actor)) throw new Error("Only the bot owner can change roles.");
    if (!this.users) throw new Error("PostgreSQL is required to persist roles.");
    const id = normalizeAccountId(target);
    await this.users.upsert(id);
    await this.users.setRole(id, role, value);
    if (value) {
      (role === "owner" ? this.owners : this.administrators).add(id);
    } else {
      (role === "owner" ? this.owners : this.administrators).delete(id);
    }
    await this.audit?.record({
      actorFacebookId: actor,
      action: value ? `grant_${role}` : `revoke_${role}`,
      targetType: "user",
      targetId: id,
      severity: "critical",
    });
    this.logger.warn({ target: id, role, value }, "Account role changed");
  }

  public ownersList(): string[] {
    return [...this.owners].sort();
  }

  public administratorsList(): string[] {
    return [...this.administrators].sort();
  }
}
