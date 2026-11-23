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
    name: "keywordtrigger",
    description: "Show the keyword-to-reply mappings configured for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const rows: readonly unknown[] = await context.services.automation.triggers(context.threadId);
      if (rows.length === 0) return { text: "No keyword triggers are configured in this thread." };
      const lines = rows.map((row, index) => {
        const keyword = show(field(row, "keyword"));
        const response = show(field(row, "response_text"));
        const active = field(row, "active") === false ? " [inactive]" : "";
        return `${index + 1}. ${keyword} → ${response}${active}`;
      });
      return { text: `Keyword triggers (${rows.length}):\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!keywordtrigger"],
    examples: ["!keywordtrigger"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
