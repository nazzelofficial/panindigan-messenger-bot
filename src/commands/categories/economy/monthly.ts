import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "monthly",
    description: "Claim your monthly coin reward.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const result = await context.services.economy.claim(
        context.senderId,
        "monthly",
        context.messageId,
      );
      return { text: result.message };
    },
  },
  {
    aliases: [],
    usage: ["!monthly"],
    examples: ["!monthly"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
