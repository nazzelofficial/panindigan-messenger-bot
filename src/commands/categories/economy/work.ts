import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "work",
    description: "Work for a random coin payout.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const result = await context.services.economy.claim(
        context.senderId,
        "work",
        context.messageId,
      );
      return { text: result.message };
    },
  },
  {
    aliases: [],
    usage: ["!work"],
    examples: ["!work"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
