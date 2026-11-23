import type { ThreadInfo } from "panindigan-automate";
import { formatDateTime } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "groupinfo",
    description: "Summarize the current Messenger group: title, members, admins and activity.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const thread: ThreadInfo | undefined = await context.messenger.getThread(context.threadId);
        if (!thread) return { text: "Thread information is unavailable right now." };
        if (!thread.isGroup)
          return {
            text: "This command only reports group conversations; this thread is a direct chat.",
          };
        const lines = [
          `Group: ${thread.name ?? "(untitled group)"}`,
          `Thread ID: ${thread.id}`,
          `Members: ${thread.participants.length}`,
          `Admins: ${thread.adminIDs.length}`,
          `Emoji: ${thread.emoji ?? "none"}`,
          thread.photoUrl ? `Photo: ${thread.photoUrl}` : undefined,
          thread.snippet ? `Last snippet: ${thread.snippet}` : undefined,
          `Last activity: ${formatDateTime(thread.updatedAt)}`,
        ].filter((line): line is string => line !== undefined);
        return { text: lines.join("\n") };
      } catch (error) {
        return {
          text: `Group lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!groupinfo"],
    examples: ["!groupinfo"],
    permission: "public",
    cooldownMs: 1000,
  },
);
