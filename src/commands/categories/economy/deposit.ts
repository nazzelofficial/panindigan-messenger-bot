import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "deposit",
    description: "Move coins from your wallet into your bank.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const amount = Number(context.args.positional[0]);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        return { text: "Usage: !deposit <positive whole amount>." };
      try {
        const result = await context.services.economy.deposit(
          context.senderId,
          amount,
          context.messageId,
        );
        return {
          text:
            "🏦 Deposited " +
            formatInteger(amount) +
            " coins.\nWallet: " +
            formatInteger(result.wallet) +
            "\nBank: " +
            formatInteger(result.bank),
        };
      } catch (error) {
        return {
          text: "Deposit failed: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!deposit <amount>"],
    examples: ["!deposit 100"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
