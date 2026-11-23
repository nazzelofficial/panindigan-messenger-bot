import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "antispam",
    description: "Show the active anti-spam thresholds loaded by the bot.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const rateLimiting = context.config.rateLimiting;
      const antiSpam = rateLimiting.antiSpam;
      return {
        text: [
          "Anti-spam protection",
          `Rate limiting: ${rateLimiting.enabled ? "enabled" : "disabled"}`,
          `Anti-spam: ${antiSpam.enabled ? "enabled" : "disabled"}`,
          `Observation window: ${antiSpam.observationWindowMs}ms`,
          `Maximum messages per window: ${antiSpam.maximumMessages}`,
          `Throttle delay: ${antiSpam.initialDelayMs}ms → ${antiSpam.maximumDelayMs}ms`,
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!antispam"],
    examples: ["!antispam"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
