import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "pay",
    description: "Pay another user with coins (alias-style transfer).",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0];
      const amount = Number(context.args.positional[1]);
      if (!id || !/^\d{4,25}$/.test(id) || !Number.isSafeInteger(amount) || amount <= 0)
        return { text: "Usage: !pay <numeric Facebook ID> <positive amount>." };
      try {
        const balance = await context.services.economy.transfer(
          context.senderId,
          id,
          amount,
          context.messageId,
        );
        return {
          text:
            "💳 Paid " +
            formatInteger(amount) +
            " coins to " +
            id +
            ". Balance: " +
            formatInteger(balance),
        };
      } catch (error) {
        return {
          text: "Payment failed: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!pay <userId> <amount>"],
    examples: ["!pay 123456789 50"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
