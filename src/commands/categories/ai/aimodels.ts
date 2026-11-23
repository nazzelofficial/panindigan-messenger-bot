import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "aimodels",
    description: "Show the model configured for each AI command level.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const rows = context.services.ai.models();
      return {
        text:
          "🧠 AI MODELS\n\n" +
          rows.map((r) => r.level + ": " + (r.configured ? r.model : "not configured")).join("\n") +
          "\n\nSet per-level models with AI_MODEL_ASK1 … AI_MODEL_ASK6.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!aimodels"],
    examples: ["!aimodels"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
