import type { ThreadInfo } from "panindigan-automate";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "membercount",
    description: "Report how many participants and administrators the current thread has.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const thread: ThreadInfo | undefined = await context.messenger.getThread(context.threadId);
        if (!thread) return { text: "Thread membership data is unavailable right now." };
        return {
          text: [
            `Thread: ${thread.name ?? "(untitled)"}`,
            `Participants: ${thread.participants.length}`,
            `Administrators: ${thread.adminIDs.length}`,
            `Type: ${thread.isGroup ? "group" : "direct chat"}`,
          ].join("\n"),
        };
      } catch (error) {
        return {
          text: `Could not count members: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!membercount"],
    examples: ["!membercount"],
    permission: "public",
    cooldownMs: 1000,
  },
);
