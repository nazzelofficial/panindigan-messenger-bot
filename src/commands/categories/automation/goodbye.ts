import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "goodbye",
    description: "Show the farewell message currently configured for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const settings = await context.services.automation.settings(context.threadId);
      const message = settings["goodbye_message"];
      if (message === null || message === undefined || message === "") {
        return { text: "No goodbye message is configured. Set one with !setgoodbye <message>." };
      }
      return { text: `Goodbye message:\n${String(message)}` };
    },
  },
  {
    aliases: [],
    usage: ["!goodbye"],
    examples: ["!goodbye"],
    permission: "admin",
    cooldownMs: 1000,
  },
);
