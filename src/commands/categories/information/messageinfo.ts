import type { Message } from "panindigan-automate";
import { truncate } from "../../../utils/text.js";
import { formatDateTime } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "messageinfo",
    description: "Inspect the invoking message's id, sender, timestamp and attachment details.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const basic = [
        `Message ID: ${context.messageId}`,
        `Thread ID: ${context.threadId}`,
        `Sender ID: ${context.senderId}`,
        `Thread: ${context.threadName ?? "(unnamed)"}`,
        `Reply: ${context.isReply ? "yes" : "no"} / Group: ${context.isGroup ? "yes" : "no"}`,
      ];
      const client = context.messenger.raw();
      if (!client)
        return {
          text: `${basic.join("\n")}\nHistory details are unavailable while Messenger is offline.`,
        };
      try {
        const history = await client.getMessages(context.threadId, { limit: 50 });
        const message: Message | undefined = history.messages.find(
          (item) => item.id === context.messageId,
        );
        if (!message) {
          return {
            text: `${basic.join("\n")}\nThis message was not present in the 50 most recent cached messages.`,
          };
        }
        const body = message.body
          ? truncate(message.body.replace(/\s+/g, " "), 300)
          : "(no text body)";
        basic.push(
          `Sent: ${formatDateTime(message.timestamp)}`,
          `Kind: ${message.kind}${message.systemType ? ` (${message.systemType})` : ""}`,
          `Body: ${body}`,
          `Attachments: ${message.attachments.length}`,
          `Mentions: ${message.mentions.length}`,
          `Reactions: ${message.reactions.length}`,
          `Read: ${message.isRead ? "yes" : "no"}`,
        );
        return { text: basic.join("\n") };
      } catch (error) {
        return {
          text: `${basic.join("\n")}\nHistory lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!messageinfo"],
    examples: ["!messageinfo"],
    permission: "public",
    cooldownMs: 1000,
  },
);
