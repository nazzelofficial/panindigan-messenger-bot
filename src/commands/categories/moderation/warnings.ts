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
    name: "warnings",
    description: "Show all active warnings recorded for a member in this group.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const candidate = context.args.positional[0];
      if (!candidate || !/^\d{4,25}$/.test(candidate)) {
        return { text: "Usage: !warnings <userId>" };
      }
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const rows: readonly unknown[] = await context.services.moderation.warnings(candidate, group);
      if (rows.length === 0)
        return { text: `No active warnings are recorded for ${candidate} in this group.` };
      const lines = rows.map((row, index) => {
        const reason = show(field(row, "reason"));
        const moderator = show(field(row, "moderator_facebook_id"));
        const when = show(field(row, "created_at"));
        return `${index + 1}. ${reason} — by ${moderator} on ${when}`;
      });
      return { text: `Active warnings for ${candidate} (${rows.length}):\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!warnings <userId>"],
    examples: ["!warnings 123456789"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
