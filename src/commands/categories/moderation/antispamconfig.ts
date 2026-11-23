import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "antispamconfig",
    description: "Inspect the effective anti-spam configuration and explain how it can be changed.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const antiSpam = context.config.rateLimiting.antiSpam;
      const current = [
        `enabled=${antiSpam.enabled}`,
        `observationWindowMs=${antiSpam.observationWindowMs}`,
        `maximumMessages=${antiSpam.maximumMessages}`,
        `initialDelayMs=${antiSpam.initialDelayMs}`,
        `maximumDelayMs=${antiSpam.maximumDelayMs}`,
      ].join(", ");
      if (context.args.positional.length === 0) {
        return {
          text: `Effective anti-spam configuration: ${current}\nThese values come from the bot configuration loaded at startup.`,
        };
      }
      return {
        text: `No runtime anti-spam override API is exposed to commands, so no values were changed. Effective configuration: ${current}. To change it, edit the bot configuration and restart.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!antispamconfig"],
    examples: ["!antispamconfig"],
    permission: "owner",
    cooldownMs: 3000,
  },
);
