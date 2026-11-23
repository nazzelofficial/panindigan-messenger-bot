import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "balance",
    description: "Show your current coin balance.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const value = await context.services.economy.balance(context.senderId);
      return {
        text:
          "💰 Balance: **" +
          formatInteger(value) +
          " " +
          context.config.economy.currencyLabel +
          "**",
      };
    },
  },
  {
    aliases: [],
    usage: ["!balance"],
    examples: ["!balance"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
  },
);
