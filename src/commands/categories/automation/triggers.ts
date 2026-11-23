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
    name: "triggers",
    description: "List all keyword triggers stored for this thread with their active status.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const rows: readonly unknown[] = await context.services.automation.triggers(context.threadId);
      if (rows.length === 0) return { text: "There are no keyword triggers in this thread." };
      const active = rows.filter((row) => field(row, "active") !== false).length;
      const lines = rows.map((row, index) => {
        const keyword = show(field(row, "keyword"));
        const state = field(row, "active") === false ? "off" : "on";
        return `${index + 1}. ${keyword} (${state})`;
      });
      return { text: `Triggers: ${active}/${rows.length} active\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!triggers"],
    examples: ["!triggers"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
