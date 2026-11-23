import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "ban",
    description: "Remove a member from this thread and record the ban in the moderation log.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0];
      if (!target || !/^\d{4,25}$/.test(target)) {
        return {
          text: context.isReply
            ? "Reply targeting is not available: the replied-to sender ID is not exposed to commands. Provide an explicit numeric user ID."
            : "Usage: !ban <userId> [reason]",
        };
      }
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const reason = context.args.positional.slice(1).join(" ").trim() || "No reason given";
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected; the member was not removed." };
      try {
        await client.removeParticipant(context.threadId, target);
      } catch (error) {
        return {
          text: `Messenger could not remove ${target}: ${describe(error)}. No ban was recorded.`,
        };
      }
      await context.services.moderation.recordAction(
        group,
        "ban",
        target,
        context.senderId,
        reason,
      );
      return { text: `Removed ${target} from the thread and logged the ban. Reason: ${reason}` };
    },
  },
  {
    aliases: [],
    usage: ["!ban <userId> [reason]"],
    examples: ["!ban 123456789 Repeated scams"],
    permission: "admin",
    cooldownMs: 3000,
  },
);
