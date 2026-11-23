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

function dueText(job: unknown): string {
  const due = field(job, "dueAt") ?? field(job, "due_at");
  if (due instanceof Date) return formatDateTime(due.getTime());
  if (typeof due === "number" && Number.isFinite(due)) return formatDateTime(due);
  if (typeof due === "string") {
    const parsed = Date.parse(due);
    if (Number.isFinite(parsed)) return formatDateTime(parsed);
  }
  return show(due);
}

export default createCommand(
  {
    name: "schedules",
    description: "List pending scheduled jobs with their ids, kinds and due times.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0];
      const limit = requested === undefined ? 20 : Number(requested);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return { text: "The optional limit must be a whole number between 1 and 100." };
      }
      const jobs: readonly unknown[] = await context.services.scheduler.list(limit);
      if (jobs.length === 0) return { text: "There are no scheduled jobs." };
      const lines = jobs.map((job, index) => {
        const id = show(field(job, "id"));
        const kind = show(field(job, "kind"));
        const status = show(field(job, "status"), "pending");
        return `${index + 1}. #${id} [${kind}] ${dueText(job)} — ${status}`;
      });
      return { text: `Scheduled jobs (${jobs.length}):\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!schedules [limit]"],
    examples: ["!schedules", "!schedules 50"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
