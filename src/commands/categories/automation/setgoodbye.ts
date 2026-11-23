import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "setgoodbye",
    description: "Set or replace the farewell message stored for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const message = context.args.positional.join(" ").trim();
      if (!message) return { text: "Usage: !setgoodbye <message>" };
      await context.services.automation.updateSettings(context.threadId, {
        goodbye_message: message,
      });
      await context.services.automation.recordRun(context.threadId, "setgoodbye", {
        length: message.length,
      });
      return { text: `Goodbye message saved:\n${message}` };
    },
  },
  {
    aliases: [],
    usage: ["!setgoodbye <message>"],
    examples: ["!setgoodbye Thanks for stopping by — you will be missed!"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
