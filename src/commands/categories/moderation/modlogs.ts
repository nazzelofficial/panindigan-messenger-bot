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
    name: "modlogs",
    description: "Show the most recent moderation actions recorded for this group.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      const limit = raw === undefined ? 50 : Number(raw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
        return { text: "The optional limit must be a whole number between 1 and 200." };
      }
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const rows: readonly unknown[] = await context.services.moderation.logHistory(group, limit);
      if (rows.length === 0)
        return { text: "No moderation actions have been recorded for this group." };
      const lines = rows.map((row, index) => {
        const action = show(field(row, "action_type"));
        const target = show(field(row, "target_facebook_id"));
        const actor = show(field(row, "actor_facebook_id"));
        const reason = show(field(row, "reason"));
        const when = show(field(row, "created_at"));
        return `${index + 1}. ${action} → ${target} by ${actor}: ${reason} (${when})`;
      });
      return { text: `Moderation log (${rows.length}):\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!modlogs [limit]"],
    examples: ["!modlogs", "!modlogs 10"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
