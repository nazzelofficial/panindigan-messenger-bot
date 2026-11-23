import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "setlanguage",
    description: "Set your preferred response language.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const value = context.args.positional[0];
      if (!value || !/^[a-z]{2,3}(?:-[A-Z]{2,4})?$/.test(value))
        return { text: "Usage: !setlanguage <locale such as en-PH>." };
      await context.services.cache.set("language:" + context.senderId, value, 60 * 60 * 24 * 365);
      return { text: "Preferred language set to **" + value + "**." };
    },
  },
  {
    aliases: [],
    usage: ["!setlanguage <locale>"],
    examples: ["!setlanguage en-PH"],
    permission: "public",
    cooldownMs: 1000,
    maintenanceSafe: false,
  },
);
