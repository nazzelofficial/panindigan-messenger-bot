import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "buy",
    description: "Buy a shop item with coins.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = Number(context.args.positional[0]);
      if (!Number.isSafeInteger(id) || id <= 0)
        return { text: "Usage: !buy <item id>. See !shop." };
      try {
        await context.services.economy.buy(context.senderId, id, context.messageId);
        return { text: "🛍️ Purchase complete. Check !inventory." };
      } catch (error) {
        return {
          text:
            "Purchase failed: " +
            (error instanceof Error ? error.message : "unknown error") +
            " No coins were charged.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!buy <itemId>"],
    examples: ["!buy 1"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
