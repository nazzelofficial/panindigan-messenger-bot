import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "setcoins",
    description: "Set a user's coin balance with an audit record (admin only).",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0];
      const amount = Number(context.args.positional[1]);
      if (!id || !/^\d{4,25}$/.test(id) || !Number.isSafeInteger(amount) || amount < 0)
        return { text: "Usage: !setcoins <numeric Facebook ID> <non-negative whole amount>." };
      try {
        const balance = await context.services.economy.setCoins(context.senderId, id, amount);
        return {
          text:
            "Set balance of " +
            id +
            " to " +
            formatInteger(balance) +
            " coins. This action was written to the audit log.",
        };
      } catch (error) {
        return {
          text: "Adjustment failed: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!setcoins <userId> <amount>"],
    examples: ["!setcoins 123456789 1000"],
    permission: "admin",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
