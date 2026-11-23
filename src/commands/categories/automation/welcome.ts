import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "welcome",
    description: "Show the welcome message currently configured for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const settings = await context.services.automation.settings(context.threadId);
      const message = settings["welcome_message"];
      if (message === null || message === undefined || message === "") {
        return { text: "No welcome message is configured. Set one with !setwelcome <message>." };
      }
      return { text: `Welcome message:\n${String(message)}` };
    },
  },
  {
    aliases: [],
    usage: ["!welcome"],
    examples: ["!welcome"],
    permission: "admin",
    cooldownMs: 1000,
  },
);
