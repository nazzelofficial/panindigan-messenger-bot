import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "ask5",
    description: "Send a level 5 request to the configured AI provider.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const text = context.args.raw.split(/\s+/).slice(1).join(" ").trim();
      if (!text) return { text: "Usage: !ask5 <message>" };
      try {
        const result = await context.services.ai.ask(
          "ask5",
          context.senderId,
          text,
          context.messageId,
        );
        const footer = result.success
          ? "\n\n— " +
            result.provider +
            " · " +
            result.model +
            (result.coinCharge > 0
              ? " · charged " + formatInteger(result.coinCharge) + " coins"
              : " · no coin charge") +
            (result.refunded ? " · refunded" : "")
          : "";
        return { text: result.text + footer };
      } catch (error) {
        return {
          text: error instanceof Error ? error.message : "The AI request could not be completed.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!ask5 <message>"],
    examples: ["!ask5 Explain photosynthesis briefly."],
    permission: "public",
    cooldownMs: 2000,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
