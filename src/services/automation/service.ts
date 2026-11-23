import type { AutomationRepository } from "../../databases/postgresql/repositories/automation.js";

export class AutomationService {
  public constructor(private readonly repository: AutomationRepository | undefined) {}

  private assert(): AutomationRepository {
    if (!this.repository) throw new Error("PostgreSQL is required for automation features.");
    return this.repository;
  }

  public settings(threadId: string) {
    return this.assert().getSettings(threadId);
  }

  public updateSettings(threadId: string, patch: Record<string, unknown>) {
    return this.assert().updateSettings(threadId, patch);
  }

  public addResponse(
    threadId: string,
    trigger: string,
    response: string,
    actor: string,
    matchMode?: string,
  ) {
    return this.assert().addResponse({ threadId, trigger, response, actor, matchMode });
  }

  public removeResponse(threadId: string, trigger: string) {
    return this.assert().removeResponse(threadId, trigger);
  }

  public responses(threadId: string) {
    return this.assert().responses(threadId);
  }

  public matchingResponses(threadId: string, message: string) {
    return this.assert().matchingResponses(threadId, message);
  }

  public addTrigger(threadId: string, keyword: string, response: string) {
    return this.assert().addTrigger(threadId, keyword, response);
  }

  public removeTrigger(threadId: string, keyword: string) {
    return this.assert().removeTrigger(threadId, keyword);
  }

  public triggers(threadId: string) {
    return this.assert().triggers(threadId);
  }

  public recordRun(threadId: string, kind: string, details: unknown) {
    return this.assert().recordRun(threadId, kind, details);
  }
}
