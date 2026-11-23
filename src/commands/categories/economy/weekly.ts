import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "weekly",
    description: "Claim your weekly coin reward.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const result = await context.services.economy.claim(
        context.senderId,
        "weekly",
        context.messageId,
      );
      return { text: result.message };
    },
  },
  {
    aliases: [],
    usage: ["!weekly"],
    examples: ["!weekly"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
