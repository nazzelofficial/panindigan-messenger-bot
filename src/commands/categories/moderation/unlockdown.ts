import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "unlockdown",
    description: "Lift a thread-wide lockdown by unmuting the thread.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const reason = context.args.positional.join(" ").trim() || "No reason given";
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected; the thread was not unmuted." };
      try {
        await client.unmuteThread(context.threadId);
      } catch (error) {
        return { text: `Messenger rejected the unlock: ${describe(error)}. No changes were made.` };
      }
      await context.services.moderation.recordAction(
        group,
        "unlockdown",
        context.threadId,
        context.senderId,
        reason,
      );
      return { text: `Thread unmuted and lockdown lifted. Reason: ${reason}` };
    },
  },
  {
    aliases: [],
    usage: ["!unlockdown [reason]"],
    examples: ["!unlockdown Situation resolved"],
    permission: "admin",
    cooldownMs: 4000,
  },
);
