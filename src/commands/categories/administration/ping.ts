import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "ping",
    description: "Check that the bot is responsive.",
    category: "administration",
    async run(_context: CommandContext): Promise<CommandResult> {
      return { text: "🏓 Pong" };
    },
  },
  {
    aliases: [],
    usage: ["!ping"],
    examples: ["!ping"],
    permission: "public",
    cooldownMs: 700,
    maintenanceSafe: true,
  },
);
