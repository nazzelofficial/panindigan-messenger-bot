import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "profilemoney",
    description: "Show a combined economy profile.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const wallet = await context.services.economy.balance(context.senderId);
      const bank = await context.services.economy.bankBalance(context.senderId).catch(() => 0);
      const history = await context.services.economy.history(context.senderId, 5);
      return {
        text: [
          "💳 ECONOMY PROFILE",
          "",
          "User: " + context.senderId,
          "Wallet: " + formatInteger(wallet),
          "Bank: " + formatInteger(bank),
          "Total: " + formatInteger(wallet + bank),
          "",
          "Recent transactions: " + history.length,
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!profilemoney"],
    examples: ["!profilemoney"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
