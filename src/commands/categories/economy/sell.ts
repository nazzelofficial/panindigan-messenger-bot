import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "sell",
    description: "Sell an inventory item back for half its price.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = Number(context.args.positional[0]);
      if (!Number.isSafeInteger(id) || id <= 0)
        return { text: "Usage: !sell <item id>. See !inventory." };
      try {
        const refund = await context.services.economy.sellItem(
          context.senderId,
          id,
          context.messageId,
        );
        return { text: "Sold item " + id + " for " + formatInteger(refund) + " coins." };
      } catch (error) {
        return {
          text: "Sale failed: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!sell <itemId>"],
    examples: ["!sell 1"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
