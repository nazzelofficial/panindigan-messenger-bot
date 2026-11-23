import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "aihelp",
    description: "Explain the AI command levels, limits and refund policy.",
    category: "ai",
    async run(_context: CommandContext): Promise<CommandResult> {
      return {
        text: [
          "🧠 AI HELP",
          "",
          "!ask1 … !ask5 — configured coin cost and daily request quota.",
          "!ask6 — zero coins and no application-level request-count limit; provider and safety limits still apply.",
          "Input length limits are configured per level. Long responses are split safely.",
          "A request that fails is charged and then fully refunded; no charge remains for failed requests.",
          "Duplicate Messenger events are ignored so you are never charged twice.",
          "Commands: !aistatus !aimodels !aibalance !aiusage !aitop !aicost !aifeedback !aicancel",
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!aihelp"],
    examples: ["!aihelp"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
