import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "settings",
    description: "Show the effective, non-sensitive application settings.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      return {
        text: [
          "⚙️ SETTINGS",
          "",
          "Environment: " + context.config.application.environment,
          "Timezone: " + context.config.application.timezone,
          "Prefix: " + context.config.identity.commandPrefix,
          "Case-insensitive commands: " + context.config.commands.ignoreCase,
          "Default cooldown: " + context.config.commands.defaultCooldownMs + " ms",
          "Rate limiting: " + context.config.rateLimiting.enabled,
          "Maintenance: " + context.config.maintenance.enabled,
          "Modules: " +
            Object.entries(context.config.modules)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(", "),
          "",
          "Credentials and connection strings are never shown.",
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!settings"],
    examples: ["!settings"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: true,
  },
);
