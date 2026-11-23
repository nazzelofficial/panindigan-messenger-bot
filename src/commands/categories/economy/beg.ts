import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "beg",
    description: "Beg for a small coin payout.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const result = await context.services.economy.claim(
        context.senderId,
        "beg",
        context.messageId,
      );
      return { text: result.message };
    },
  },
  {
    aliases: [],
    usage: ["!beg"],
    examples: ["!beg"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
