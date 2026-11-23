import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "accountinfo",
    description: "Identify the Messenger account this bot is currently authenticated as.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const me = await context.messenger.getMe();
        if (!me)
          return {
            text: "The bot's own profile is not available while Messenger is disconnected.",
          };
        const lines = [
          `Bot account: ${me.name ?? "Unnamed account"}`,
          `User ID: ${me.id}`,
          `Session user ID: ${context.messenger.currentUserId || "unknown"}`,
          `Connection: ${context.messenger.isConnected ? "connected" : "disconnected"}`,
          me.vanity ? `Username: ${me.vanity}` : undefined,
          me.profileUrl ? `Profile link: ${me.profileUrl}` : undefined,
          `Verified: ${me.isVerified ? "yes" : "no"}`,
        ].filter((line): line is string => line !== undefined);
        return { text: lines.join("\n") };
      } catch (error) {
        return {
          text: `Could not read the bot account: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!accountinfo"],
    examples: ["!accountinfo"],
    permission: "public",
    cooldownMs: 1000,
  },
);
