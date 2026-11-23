import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "activity",
    description: "Show recent command activity from the operational database.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const limit = Math.min(50, Math.max(1, Number(context.args.positional[0] ?? 10) || 10));
      const rows = (await context.databases.operational?.recentCommands(limit)) as
        Array<Record<string, unknown>> | undefined;
      if (!rows?.length) return { text: "No command activity has been recorded yet." };
      const lines = rows.map(
        (r) =>
          String(r.command_name) +
          " | " +
          String(r.user_id) +
          " | " +
          (r.success ? "ok" : "failed") +
          " | " +
          String(r.duration_ms) +
          "ms",
      );
      return { text: "📈 RECENT ACTIVITY\n\n" + lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!activity [limit]"],
    examples: ["!activity 10"],
    permission: "admin",
    cooldownMs: 1500,
    maintenanceSafe: false,
  },
);
