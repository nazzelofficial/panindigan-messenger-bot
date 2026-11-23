import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "unmute",
    description: "Unmute conversation activity in this thread and close the stored mute record.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0];
      if (!target || !/^\d{4,25}$/.test(target)) {
        return {
          text: context.isReply
            ? "Reply targeting is not available: the replied-to sender ID is not exposed to commands. Provide an explicit numeric user ID."
            : "Usage: !unmute <userId>",
        };
      }
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected; no unmute was applied." };
      try {
        await client.unmuteThread(context.threadId);
      } catch (error) {
        return { text: `Messenger rejected the unmute: ${describe(error)}. No changes were made.` };
      }
      await context.services.moderation.unmute(group, target);
      await context.services.moderation.recordAction(
        group,
        "unmute",
        target,
        context.senderId,
        "Thread unmuted",
      );
      return {
        text: `Thread notifications restored. Messenger mutes whole threads, not individual members; the stored mute record for ${target} was closed.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!unmute <userId>"],
    examples: ["!unmute 123456789"],
    permission: "admin",
    cooldownMs: 3000,
  },
);
