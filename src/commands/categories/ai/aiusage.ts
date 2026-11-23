import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "aiusage",
    description: "Show your recent AI usage records.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const limit = Math.min(20, Math.max(1, Number(context.args.positional[0] ?? 10) || 10));
      try {
        const rows = await context.services.ai.usage(context.senderId, limit);
        return {
          text: rows.length
            ? "📊 AI USAGE\n\n" + JSON.stringify(rows, null, 2).slice(0, 1800)
            : "No AI usage recorded yet.",
        };
      } catch (error) {
        return {
          text:
            "Could not read AI usage: " +
            (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!aiusage [limit]"],
    examples: ["!aiusage 10"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
