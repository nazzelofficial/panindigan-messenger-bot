import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "setwelcome",
    description: "Set or replace the welcome message stored for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const message = context.args.positional.join(" ").trim();
      if (!message) return { text: "Usage: !setwelcome <message>" };
      await context.services.automation.updateSettings(context.threadId, {
        welcome_message: message,
      });
      await context.services.automation.recordRun(context.threadId, "setwelcome", {
        length: message.length,
      });
      return { text: `Welcome message saved:\n${message}` };
    },
  },
  {
    aliases: [],
    usage: ["!setwelcome <message>"],
    examples: ["!setwelcome Welcome! Read the pinned rules before posting."],
    permission: "admin",
    cooldownMs: 2000,
  },
);
