import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "id",
    description: "Print the sender, thread and message IDs available for the current event.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const lines = [
        `Your user ID: ${context.senderId}`,
        `Thread ID: ${context.threadId}`,
        `Message ID: ${context.messageId}`,
        `Bot user ID: ${context.messenger.currentUserId || "unknown"}`,
        `Thread name: ${context.threadName ?? "(unnamed)"}`,
      ];
      const target = context.args.positional[0];
      if (target && target !== context.senderId) lines.push(`Requested ID: ${target}`);
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!id [userId]"],
    examples: ["!id", "!id 1234567890"],
    permission: "public",
    cooldownMs: 500,
  },
);
