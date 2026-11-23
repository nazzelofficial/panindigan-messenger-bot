import type { ThreadInfo } from "panindigan-automate";
import { formatDateTime } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "threadinfo",
    description: "Show raw thread state such as unread counts, archive status and read timestamps.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const thread: ThreadInfo | undefined = await context.messenger.getThread(context.threadId);
        if (!thread) return { text: "No thread data was returned for this conversation." };
        const lines = [
          `Thread: ${thread.name ?? "(untitled)"}`,
          `ID: ${thread.id}`,
          `Kind: ${thread.isGroup ? "group" : "direct chat"}`,
          `Can reply: ${thread.canReply ? "yes" : "no"}`,
          `Unread: ${thread.unreadCount}`,
          `Archived: ${thread.isArchived === null ? "unknown" : thread.isArchived ? "yes" : "no"}`,
          `Muted until: ${thread.muteUntil === null ? "not muted" : formatDateTime(thread.muteUntil)}`,
          `Last message: ${thread.lastMessageTimestamp === null ? "unknown" : formatDateTime(thread.lastMessageTimestamp)}`,
          `Last read: ${thread.lastReadTimestamp === null ? "unknown" : formatDateTime(thread.lastReadTimestamp)}`,
          `Color: ${thread.color ?? "default"}`,
          `Saved nicknames: ${Object.keys(thread.nicknames).length}`,
        ];
        return { text: lines.join("\n") };
      } catch (error) {
        return {
          text: `Thread lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!threadinfo"],
    examples: ["!threadinfo"],
    permission: "public",
    cooldownMs: 1000,
  },
);
