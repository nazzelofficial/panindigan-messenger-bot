import type { ThreadInfo } from "panindigan-automate";
import type { GroupRepository } from "../databases/postgresql/repositories/core.js";
import type { AppLogger } from "../logging/logger.js";

export interface RegisteredGroup {
  threadId: string;
  name: string | null;
  isGroup: boolean;
  canReply: boolean;
  participantCount: number;
  adminIds: readonly string[];
  lastSeenAt: number;
}

/** Reliable registry of chats the authenticated account can actually reach. */
export class GroupRegistry {
  private readonly groups = new Map<string, RegisteredGroup>();

  public constructor(
    private readonly repository: GroupRepository | undefined,
    private readonly logger: AppLogger,
  ) {}

  public observe(info: ThreadInfo): void {
    const group: RegisteredGroup = {
      threadId: info.id,
      name: info.name,
      isGroup: info.isGroup,
      canReply: info.canReply,
      participantCount: info.participantIds.length,
      adminIds: info.adminIDs,
      lastSeenAt: Date.now(),
    };
    this.groups.set(info.id, group);
    void this.repository?.upsert(info.id, {
      name: info.name,
      isGroup: info.isGroup,
      participantCount: group.participantCount,
    });
  }

  public observeThread(threadId: string, isGroup: boolean): void {
    const existing = this.groups.get(threadId);
    if (existing) {
      existing.lastSeenAt = Date.now();
      return;
    }
    const group: RegisteredGroup = {
      threadId,
      name: null,
      isGroup,
      canReply: true,
      participantCount: 0,
      adminIds: [],
      lastSeenAt: Date.now(),
    };
    this.groups.set(threadId, group);
    void this.repository?.upsert(threadId, { isGroup });
  }

  /** Groups eligible for global notices: accessible group threads only. */
  public eligibleGroups(): RegisteredGroup[] {
    return [...this.groups.values()].filter((group) => group.isGroup && group.canReply);
  }

  public async hydrateFromDatabase(): Promise<void> {
    if (!this.repository) return;
    const rows = await this.repository.listActive();
    for (const row of rows) {
      if (!this.groups.has(row.thread_id)) {
        this.groups.set(row.thread_id, {
          threadId: row.thread_id,
          name: row.name,
          isGroup: row.is_group,
          canReply: true,
          participantCount: row.participant_count,
          adminIds: [],
          lastSeenAt: row.last_seen_at?.getTime() ?? 0,
        });
      }
    }
    this.logger.info({ groups: this.groups.size }, "Group registry hydrated");
  }

  public get(threadId: string): RegisteredGroup | undefined {
    return this.groups.get(threadId);
  }
}
