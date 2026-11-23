import type { ThreadInfo } from "panindigan-automate";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

const MAX_LISTED = 30;

export default createCommand(
  {
    name: "members",
    description: "List the participants of the current thread with their display names.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const thread: ThreadInfo | undefined = await context.messenger.getThread(context.threadId);
        if (!thread) return { text: "Could not load the participant list for this thread." };
        const participants = thread.participants;
        if (participants.length === 0) return { text: "This thread has no cached participants." };
        const listed = participants.slice(0, MAX_LISTED);
        const lines = listed.map((participant, index) => {
          const label = participant.name ?? participant.id;
          const kind = participant.accountType ? ` [${participant.accountType}]` : "";
          return `${index + 1}. ${label}${kind} — ${participant.id}`;
        });
        if (participants.length > listed.length) {
          lines.push(
            `… and ${participants.length - listed.length} more (${participants.length} total).`,
          );
        } else {
          lines.push(`Total: ${participants.length} participants.`);
        }
        return { text: lines.join("\n") };
      } catch (error) {
        return {
          text: `Member listing failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!members"],
    examples: ["!members"],
    permission: "public",
    cooldownMs: 1000,
  },
);
