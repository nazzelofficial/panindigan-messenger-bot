import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "withdraw",
    description: "Move coins from your bank into your wallet.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const amount = Number(context.args.positional[0]);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        return { text: "Usage: !withdraw <positive whole amount>." };
      try {
        const result = await context.services.economy.withdraw(
          context.senderId,
          amount,
          context.messageId,
        );
        return {
          text:
            "💵 Withdrew " +
            formatInteger(amount) +
            " coins.\nWallet: " +
            formatInteger(result.wallet) +
            "\nBank: " +
            formatInteger(result.bank),
        };
      } catch (error) {
        return {
          text: "Withdrawal failed: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!withdraw <amount>"],
    examples: ["!withdraw 100"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
