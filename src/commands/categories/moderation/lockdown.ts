import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "lockdown",
    description: "Mute the entire thread indefinitely to stop activity during an incident.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const reason = context.args.positional.join(" ").trim() || "No reason given";
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected; the thread was not locked down." };
      try {
        await client.muteThread(context.threadId, "always");
      } catch (error) {
        return {
          text: `Messenger rejected the lockdown: ${describe(error)}. No changes were made.`,
        };
      }
      await context.services.moderation.recordAction(
        group,
        "lockdown",
        context.threadId,
        context.senderId,
        reason,
      );
      return {
        text: `Thread locked down: notifications are muted indefinitely for the bot account. Reason: ${reason}. Use !unlockdown to restore.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!lockdown [reason]"],
    examples: ["!lockdown Raids in progress"],
    permission: "admin",
    cooldownMs: 4000,
  },
);
