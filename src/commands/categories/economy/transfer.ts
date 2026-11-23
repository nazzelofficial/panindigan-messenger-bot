import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "transfer",
    description: "Send coins to another user.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0];
      const amount = Number(context.args.positional[1]);
      if (!id || !/^\d{4,25}$/.test(id) || !Number.isSafeInteger(amount) || amount <= 0)
        return { text: "Usage: !transfer <numeric Facebook ID> <positive amount>." };
      try {
        const balance = await context.services.economy.transfer(
          context.senderId,
          id,
          amount,
          context.messageId,
        );
        return {
          text:
            "✅ Sent " +
            formatInteger(amount) +
            " coins to " +
            id +
            ". Your new balance: " +
            formatInteger(balance),
        };
      } catch (error) {
        return {
          text:
            "Transfer failed: " +
            (error instanceof Error ? error.message : "unknown error") +
            " No coins were moved.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!transfer <userId> <amount>"],
    examples: ["!transfer 123456789 50"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
