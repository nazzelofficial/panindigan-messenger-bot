import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "setprefix",
    description: "Change the command prefix at runtime (owner only).",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const value = context.args.positional[0];
      if (!value || value.length > 4)
        return { text: "Usage: !setprefix <1-4 characters>. No change was made." };
      await context.services.cache.set("runtime:prefix", value, 60 * 60 * 24 * 30);
      context.logger.warn({ actor: context.senderId, prefix: value }, "Command prefix changed");
      return {
        text:
          "Command prefix set to **" +
          value +
          "**. The original value in config.json is restored after 30 days.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!setprefix <prefix>"],
    examples: ["!setprefix ?"],
    permission: "owner",
    cooldownMs: 1000,
    maintenanceSafe: false,
  },
);
