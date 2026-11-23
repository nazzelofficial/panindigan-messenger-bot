import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "language",
    description: "Show your preferred response language.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const value = await context.services.cache.get("language:" + context.senderId);
      return { text: "Your language: **" + (value ?? context.config.application.language) + "**" };
    },
  },
  {
    aliases: [],
    usage: ["!language"],
    examples: ["!language"],
    permission: "public",
    cooldownMs: 800,
    maintenanceSafe: true,
  },
);
