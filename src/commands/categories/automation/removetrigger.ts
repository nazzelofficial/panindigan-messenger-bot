import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "removetrigger",
    description: "Remove a keyword trigger from this thread by its keyword.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const keyword = context.args.positional[0]?.trim();
      if (!keyword) return { text: "Usage: !removetrigger <keyword>" };
      const removed = await context.services.automation.removeTrigger(context.threadId, keyword);
      if (!removed)
        return { text: `No keyword trigger "${keyword.toLowerCase()}" exists in this thread.` };
      await context.services.automation.recordRun(context.threadId, "removetrigger", { keyword });
      return { text: `Removed the keyword trigger "${keyword.toLowerCase()}".` };
    },
  },
  {
    aliases: [],
    usage: ["!removetrigger <keyword>"],
    examples: ["!removetrigger rules"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
