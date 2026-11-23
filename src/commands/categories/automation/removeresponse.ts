import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "removeresponse",
    description: "Delete a stored automatic response by its exact trigger phrase.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const trigger = context.args.positional[0]?.trim();
      if (!trigger) return { text: "Usage: !removeresponse <trigger>" };
      const removed = await context.services.automation.removeResponse(context.threadId, trigger);
      if (!removed)
        return { text: `No auto-response with trigger "${trigger}" exists in this thread.` };
      await context.services.automation.recordRun(context.threadId, "removeresponse", { trigger });
      return { text: `Removed the auto-response for "${trigger}".` };
    },
  },
  {
    aliases: [],
    usage: ["!removeresponse <trigger>"],
    examples: ["!removeresponse hello"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
