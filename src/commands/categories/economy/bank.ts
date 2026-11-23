import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "bank",
    description: "Show your wallet and bank balances.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const wallet = await context.services.economy.balance(context.senderId);
      const bank = await context.services.economy.bankBalance(context.senderId);
      return {
        text:
          "🏦 Wallet: " +
          formatInteger(wallet) +
          "\n🏦 Bank: " +
          formatInteger(bank) +
          "\nTotal: " +
          formatInteger(wallet + bank),
      };
    },
  },
  {
    aliases: [],
    usage: ["!bank"],
    examples: ["!bank"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
