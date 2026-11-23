import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "botinfo",
    description: "Show bot identity and publisher information.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const me = await context.messenger.getMe();
      return {
        text: [
          "🤖 " + context.config.application.name,
          "",
          "Display name: " + context.config.identity.botName,
          "Logged in as: " + (me?.name ?? context.messenger.currentUserId),
          "Publisher: " + context.config.identity.publisher.name,
          "Locale: " + context.config.application.language,
          "Timezone: " + context.config.application.timezone,
          "Environment: " + context.config.application.environment,
        ].join("\n"),
      };
    },
  },
  {
    aliases: ["about"],
    usage: ["!botinfo"],
    examples: ["!botinfo"],
    permission: "public",
    cooldownMs: 1000,
    maintenanceSafe: true,
  },
);
