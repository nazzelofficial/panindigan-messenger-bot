import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "setautodelete",
    description: "Set the automatic deletion timer in seconds, or use 0 to disable it.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      const seconds = raw === undefined ? Number.NaN : Number(raw);
      if (!Number.isInteger(seconds) || seconds < 0 || seconds > 604800) {
        return { text: "Usage: !setautodelete <seconds> (0–604800; use 0 to disable)" };
      }
      await context.services.automation.updateSettings(context.threadId, {
        auto_delete_seconds: seconds,
      });
      await context.services.automation.recordRun(context.threadId, "setautodelete", { seconds });
      return {
        text:
          seconds === 0
            ? "Automatic deletion is now disabled in this thread."
            : `Automatic deletion set to ${seconds} seconds in this thread.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!setautodelete <seconds>"],
    examples: ["!setautodelete 300", "!setautodelete 0"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
