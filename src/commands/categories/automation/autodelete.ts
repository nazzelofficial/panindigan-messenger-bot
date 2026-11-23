import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "autodelete",
    description: "Show the automatic deletion timer configured for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const settings = await context.services.automation.settings(context.threadId);
      const seconds = settings["auto_delete_seconds"];
      const value = typeof seconds === "number" ? seconds : null;
      return {
        text:
          value === null || value <= 0
            ? "Automatic deletion is off in this thread. Set it with !setautodelete <seconds>."
            : `Automatic deletion is set to ${value} seconds. Disable it with !setautodelete 0.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!autodelete"],
    examples: ["!autodelete"],
    permission: "admin",
    cooldownMs: 1000,
  },
);
