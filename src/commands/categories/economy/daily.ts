import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "daily",
    description: "Claim your daily coin reward.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const result = await context.services.economy.claim(
        context.senderId,
        "daily",
        context.messageId,
      );
      return { text: result.message };
    },
  },
  {
    aliases: [],
    usage: ["!daily"],
    examples: ["!daily"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
