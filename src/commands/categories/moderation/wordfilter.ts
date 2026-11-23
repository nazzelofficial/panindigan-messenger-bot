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
    name: "wordfilter",
    description: "Summarize the filtered words configured for this group.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const rows: readonly unknown[] = await context.services.moderation.filters(group);
      if (rows.length === 0) return { text: "No words are filtered in this group." };
      const words = rows.map((row) => show(field(row, "word"))).join(", ");
      return {
        text: `${rows.length} filtered word(s) in this group: ${words}\nUse !filterlist for full details or !addfilter / !removefilter to edit.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!wordfilter"],
    examples: ["!wordfilter"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
