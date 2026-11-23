import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "use",
    description: "Consume one unit of an owned item.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = Number(context.args.positional[0]);
      if (!Number.isSafeInteger(id) || id <= 0)
        return { text: "Usage: !use <item id>. See !inventory." };
      try {
        const name = await context.services.economy.useItem(context.senderId, id);
        return { text: "Used **" + name + "** from your inventory." };
      } catch (error) {
        return {
          text: "Could not use item: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!use <itemId>"],
    examples: ["!use 1"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
