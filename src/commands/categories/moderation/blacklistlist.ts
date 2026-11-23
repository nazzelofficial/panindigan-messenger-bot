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
    name: "blacklistlist",
    description: "List blacklist entries, optionally limited to users or groups.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0]?.toLowerCase();
      if (requested !== undefined && requested !== "user" && requested !== "group") {
        return { text: "Optional scope must be user or group." };
      }
      const rows: readonly unknown[] =
        requested === undefined
          ? await context.services.moderation.blacklist()
          : await context.services.moderation.blacklist(requested);
      if (rows.length === 0) return { text: "The blacklist is empty." };
      const lines = rows.map((row, index) => {
        const scope = show(field(row, "scope"));
        const value = show(field(row, "value"));
        const reason = show(field(row, "reason"));
        const by = show(field(row, "created_by"));
        const when = show(field(row, "created_at"));
        return `${index + 1}. ${scope} ${value} — ${reason} (by ${by}, ${when})`;
      });
      return { text: `Blacklist entries (${rows.length}):\n${lines.join("\n")}` };
    },
  },
  {
    aliases: [],
    usage: ["!blacklistlist [user|group]"],
    examples: ["!blacklistlist", "!blacklistlist user"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
