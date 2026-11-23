import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "unrestrict",
    description: "Restore group administrator privileges to a previously restricted member.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0];
      if (!target || !/^\d{4,25}$/.test(target)) {
        return {
          text: context.isReply
            ? "Reply targeting is not available: the replied-to sender ID is not exposed to commands. Provide an explicit numeric user ID."
            : "Usage: !unrestrict <userId> [reason]",
        };
      }
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const reason = context.args.positional.slice(1).join(" ").trim() || "No reason given";
      const thread = await context.messenger.getThread(context.threadId);
      if (!thread)
        return { text: "Thread information is unavailable, so the action was not attempted." };
      if (!thread.participantIds.includes(target)) {
        return { text: `${target} is not a participant of this thread; nothing was changed.` };
      }
      if (thread.adminIDs.includes(target)) {
        return { text: `${target} already has admin privileges; nothing was changed.` };
      }
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected; privileges were not changed." };
      try {
        await client.changeAdminStatus(context.threadId, target, true);
      } catch (error) {
        return {
          text: `Messenger rejected the promotion: ${describe(error)}. No changes were made.`,
        };
      }
      await context.services.moderation.recordAction(
        group,
        "unrestrict",
        target,
        context.senderId,
        reason,
      );
      return {
        text: `Restored admin privileges to ${target} and logged the action. Reason: ${reason}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!unrestrict <userId> [reason]"],
    examples: ["!unrestrict 123456789 Warning period served"],
    permission: "admin",
    cooldownMs: 3000,
  },
);
