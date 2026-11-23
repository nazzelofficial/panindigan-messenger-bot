import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "aibalance",
    description: "Show your AI spending and remaining wallet balance.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const svc = context.services.ai;
      try {
        const [balance, spent] = await Promise.all([
          svc.balance(context.senderId),
          svc.totalSpent(context.senderId),
        ]);
        return {
          text:
            "💳 AI BALANCE\n\nWallet: " +
            formatInteger(balance) +
            "\nLifetime AI spend: " +
            formatInteger(spent),
        };
      } catch (error) {
        return {
          text:
            "Could not read AI accounting: " +
            (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!aibalance"],
    examples: ["!aibalance"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
