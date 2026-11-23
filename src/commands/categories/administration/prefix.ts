import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "prefix",
    description: "Show the active command prefix.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const current = await context.services.cache.get("runtime:prefix");
      return {
        text: "Command prefix: **" + (current ?? context.config.identity.commandPrefix) + "**",
      };
    },
  },
  {
    aliases: [],
    usage: ["!prefix"],
    examples: ["!prefix"],
    permission: "public",
    cooldownMs: 800,
    maintenanceSafe: false,
  },
);
