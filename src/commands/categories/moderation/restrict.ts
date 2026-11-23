import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "restrict",
    description: "Demote a member from group administrator and log the restriction.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0];
      if (!target || !/^\d{4,25}$/.test(target)) {
        return {
          text: context.isReply
            ? "Reply targeting is not available: the replied-to sender ID is not exposed to commands. Provide an explicit numeric user ID."
            : "Usage: !restrict <userId> [reason]",
        };
      }
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const reason = context.args.positional.slice(1).join(" ").trim() || "No reason given";
      const thread = await context.messenger.getThread(context.threadId);
      if (!thread)
        return { text: "Thread information is unavailable, so the restriction was not attempted." };
      if (!thread.participantIds.includes(target)) {
        return { text: `${target} is not a participant of this thread; nothing was changed.` };
      }
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected; the restriction was not applied." };
      try {
        await client.changeAdminStatus(context.threadId, target, false);
      } catch (error) {
        return {
          text: `Messenger rejected the restriction: ${describe(error)}. No changes were made.`,
        };
      }
      await context.services.moderation.recordAction(
        group,
        "restrict",
        target,
        context.senderId,
        reason,
      );
      return {
        text: `Removed admin privileges from ${target} and logged the restriction. Messenger has no granular per-user permission limits; admin status is the available control. Reason: ${reason}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!restrict <userId> [reason]"],
    examples: ["!restrict 123456789 Abusing admin tools"],
    permission: "admin",
    cooldownMs: 3000,
  },
);
