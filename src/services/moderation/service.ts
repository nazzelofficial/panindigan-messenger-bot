import type { ModerationRepository } from "../../databases/postgresql/repositories/moderation.js";

/** Command-facing façade over the moderation repository. */
export class ModerationService {
  public constructor(private readonly repository: ModerationRepository | undefined) {}

  private assert(): ModerationRepository {
    if (!this.repository) throw new Error("PostgreSQL is required for moderation features.");
    return this.repository;
  }

  public addWarning(
    groupId: number | undefined,
    userId: string,
    moderator: string,
    reason: string,
  ) {
    return this.assert().addWarning({
      groupId,
      userFacebookId: userId,
      moderatorFacebookId: moderator,
      reason,
    });
  }

  public warnings(userId: string, groupId?: number) {
    return this.assert().warnings(userId, groupId);
  }

  public clearWarnings(userId: string, groupId?: number) {
    return this.assert().clearWarnings(userId, groupId);
  }

  public recordAction(
    groupId: number | undefined,
    action: string,
    target: string,
    actor: string,
    reason?: string,
  ) {
    return this.assert().recordAction({
      groupId,
      actionType: action,
      targetFacebookId: target,
      actorFacebookId: actor,
      reason,
    });
  }

  public mute(groupId: number, userId: string, expiresAt: Date | null, actor: string) {
    return this.assert().mute({ groupId, userFacebookId: userId, expiresAt, actor });
  }

  public unmute(groupId: number, userId: string) {
    return this.assert().unmute(groupId, userId);
  }

  public addReport(groupId: number | undefined, reporter: string, target: string, reason: string) {
    return this.assert().addReport({ groupId, reporter, target, reason });
  }

  public reports(status?: string) {
    return this.assert().reports(status);
  }

  public resolveReport(id: number, status: string) {
    return this.assert().resolveReport(id, status);
  }

  public addBlacklist(scope: "user" | "group", value: string, reason: string, actor: string) {
    return this.assert().addBlacklist(scope, value, reason, actor);
  }

  public removeBlacklist(scope: "user" | "group", value: string) {
    return this.assert().removeBlacklist(scope, value);
  }

  public blacklist(scope?: "user" | "group") {
    return this.assert().blacklist(scope);
  }

  public addFilter(groupId: number, word: string, action: string, actor: string) {
    return this.assert().addFilter(groupId, word, action, actor);
  }

  public removeFilter(groupId: number, word: string) {
    return this.assert().removeFilter(groupId, word);
  }

  public filters(groupId: number) {
    return this.assert().filters(groupId);
  }

  public logHistory(groupId?: number, limit = 50) {
    return this.assert().logHistory(groupId, limit);
  }
}
