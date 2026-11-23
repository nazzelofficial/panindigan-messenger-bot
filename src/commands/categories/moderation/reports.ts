import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function field(row: unknown, key: string): unknown {
  if (typeof row !== "object" || row === null) return undefined;
  return (row as Record<string, unknown>)[key];
}

function show(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint")
    return String(value);
  return JSON.stringify(value) ?? "—";
}

export default createCommand(
  {
    name: "reports",
    description: "List stored moderation reports, optionally filtered by status.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const status = context.args.positional[0]?.trim() ?? "open";
      if (!/^[a-zA-Z]{3,20}$/.test(status))
        return { text: "Status must be a short word such as open or resolved." };
      const rows: readonly unknown[] = await context.services.moderation.reports(status);
      if (rows.length === 0) return { text: `No reports with status "${status}" were found.` };
      const lines = rows.map((row, index) => {
        const id = show(field(row, "id"));
        const reporter = show(field(row, "reporter_facebook_id"));
        const target = show(field(row, "target_facebook_id"));
        const reason = show(field(row, "reason"));
        const state = show(field(row, "status"));
        const when = show(field(row, "created_at"));
        return `${index + 1}. #${id} [${state}] ${target} reported by ${reporter}: ${reason} (${when})`;
      });
      return { text: `Reports with status "${status}" (${rows.length}):\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!reports [status]"],
    examples: ["!reports", "!reports resolved"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
