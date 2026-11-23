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
    name: "responses",
    description: "List every automatic response configured in this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const rows: readonly unknown[] = await context.services.automation.responses(
        context.threadId,
      );
      if (rows.length === 0) return { text: "No auto-responses are configured in this thread." };
      const lines = rows.map((row, index) => {
        const trigger = show(field(row, "trigger_text"));
        const response = show(field(row, "response_text"));
        const mode = show(field(row, "match_mode"));
        const active = field(row, "active") === false ? " (inactive)" : "";
        return `${index + 1}. "${trigger}" → "${response}" [${mode}]${active}`;
      });
      return { text: `Auto-responses (${rows.length}):\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!responses"],
    examples: ["!responses"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
