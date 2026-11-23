import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "addtrigger",
    description: "Add or update a keyword that triggers an automatic reply in this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const keyword = context.args.positional[0]?.trim();
      const response = context.args.positional.slice(1).join(" ").trim();
      if (!keyword || !response) return { text: "Usage: !addtrigger <keyword> <response>" };
      await context.services.automation.addTrigger(context.threadId, keyword, response);
      await context.services.automation.recordRun(context.threadId, "addtrigger", { keyword });
      return { text: `Keyword trigger "${keyword.toLowerCase()}" now replies with: ${response}` };
    },
  },
  {
    aliases: [],
    usage: ["!addtrigger <keyword> <response>"],
    examples: ["!addtrigger rules Please read the pinned rules first."],
    permission: "admin",
    cooldownMs: 2000,
  },
);
