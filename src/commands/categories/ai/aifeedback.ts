import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "aifeedback",
    description: "Rate your most recent AI response from 1 to 5.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const rating = Number(context.args.positional[0]);
      const comment = context.args.positional.slice(1).join(" ");
      try {
        await context.services.ai.feedback(context.senderId, rating, comment);
        return { text: "Thank you. Your rating was recorded." };
      } catch (error) {
        return { text: error instanceof Error ? error.message : "Feedback could not be recorded." };
      }
    },
  },
  {
    aliases: [],
    usage: ["!aifeedback <1-5> [comment]"],
    examples: ["!aifeedback 5 Very helpful"],
    permission: "public",
    cooldownMs: 2000,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
