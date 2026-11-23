import type { ThreadInfo } from "panindigan-automate";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "adminslist",
    description: "List the administrators of the current Messenger group by name and ID.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const thread: ThreadInfo | undefined = await context.messenger.getThread(context.threadId);
        if (!thread) return { text: "Could not load admin information for this thread." };
        if (!thread.isGroup) return { text: "Direct chats do not have administrators." };
        if (thread.adminIDs.length === 0)
          return { text: `No administrators are recorded for "${thread.name ?? "this group"}".` };
        const names = new Map(
          thread.participants.map((participant) => [
            participant.id,
            participant.name ?? participant.id,
          ]),
        );
        const lines = thread.adminIDs.map(
          (id, index) => `${index + 1}. ${names.get(id) ?? id} — ${id}`,
        );
        lines.push(`Total: ${thread.adminIDs.length} admin(s).`);
        return { text: lines.join("\n") };
      } catch (error) {
        return {
          text: `Admin lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!adminslist"],
    examples: ["!adminslist"],
    permission: "public",
    cooldownMs: 1000,
  },
);
