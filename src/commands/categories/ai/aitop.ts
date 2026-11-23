import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "aitop",
    description: "Show users with the most AI requests.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const limit = Math.min(20, Math.max(1, Number(context.args.positional[0] ?? 10) || 10));
      try {
        const rows = await context.services.ai.top(limit);
        return {
          text: rows.length
            ? "🏆 TOP AI USERS\n\n" + JSON.stringify(rows, null, 2).slice(0, 1800)
            : "No AI usage recorded yet.",
        };
      } catch (error) {
        return {
          text:
            "Could not read AI statistics: " +
            (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!aitop [limit]"],
    examples: ["!aitop 10"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
