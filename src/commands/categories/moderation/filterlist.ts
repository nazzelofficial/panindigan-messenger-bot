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
    name: "filterlist",
    description: "List filtered words for this group with their configured actions.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const rows: readonly unknown[] = await context.services.moderation.filters(group);
      if (rows.length === 0) return { text: "The filter list for this group is empty." };
      const lines = rows.map((row, index) => {
        const id = show(field(row, "id"));
        const word = show(field(row, "word"));
        const action = show(field(row, "action"));
        return `${index + 1}. #${id} "${word}" → ${action}`;
      });
      return { text: `Word filters (${rows.length}):\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!filterlist"],
    examples: ["!filterlist"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
