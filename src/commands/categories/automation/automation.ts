import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatDateTime } from "../../../utils/time.js";

function field(row: unknown, key: string): unknown {
  if (typeof row !== "object" || row === null) return undefined;
  return (row as Record<string, unknown>)[key];
}

function show(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    return String(value);
  return JSON.stringify(value) ?? fallback;
}

export default createCommand(
  {
    name: "automation",
    description: "Display a consolidated dashboard of this thread's automation configuration.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const [settings, responses, triggers, jobs] = await Promise.all([
        context.services.automation.settings(context.threadId),
        context.services.automation.responses(context.threadId),
        context.services.automation.triggers(context.threadId),
        context.services.scheduler.list(5),
      ]);
      const upcoming = jobs
        .slice(0, 3)
        .map((job, index) => {
          const due = field(job, "dueAt");
          const when = due instanceof Date ? formatDateTime(due.getTime()) : show(due);
          return `${index + 1}. ${show(field(job, "kind"))} — ${when}`;
        })
        .join("\n");
      return {
        text: [
          `Automation dashboard — ${context.threadName ?? context.threadId}`,
          `Auto responses: ${responses.length} | Keyword triggers: ${triggers.length}`,
          `Welcome: ${show(settings["welcome_message"], "not set")}`,
          `Goodbye: ${show(settings["goodbye_message"], "not set")}`,
          `Auto-react emoji: ${show(settings["auto_react_emoji"], "off")}`,
          `Auto-delete: ${show(settings["auto_delete_seconds"], "off")} seconds`,
          `Announcements: ${show(settings["announcement_enabled"], "off")}`,
          `Upcoming jobs (${jobs.length}):`,
          upcoming || "none",
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!automation"],
    examples: ["!automation"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
