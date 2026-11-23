import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "mute",
    description:
      "Mute conversation activity in this thread for a duration and record a moderation note.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0];
      if (!target || !/^\d{4,25}$/.test(target)) {
        return {
          text: context.isReply
            ? "Reply targeting is not available: the replied-to sender ID is not exposed to commands. Provide an explicit numeric user ID."
            : "Usage: !mute <userId> [minutes|always] [reason]",
        };
      }
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const durationArg = context.args.positional[1];
      let duration: number | "always";
      let expiresAt: Date | null;
      if (durationArg === undefined || durationArg.toLowerCase() === "always") {
        duration = "always";
        expiresAt = null;
      } else {
        const minutes = Number(durationArg);
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 525600) {
          return { text: "Duration must be a whole number of minutes (1–525600) or 'always'." };
        }
        duration = minutes;
        expiresAt = new Date(Date.now() + minutes * 60_000);
      }
      const reason = context.args.positional.slice(2).join(" ").trim() || "No reason given";
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected; no mute was applied." };
      try {
        await client.muteThread(context.threadId, duration);
      } catch (error) {
        return { text: `Messenger rejected the mute: ${describe(error)}. No mute was applied.` };
      }
      await context.services.moderation.mute(group, target, expiresAt, context.senderId);
      await context.services.moderation.recordAction(
        group,
        "mute",
        target,
        context.senderId,
        reason,
      );
      return {
        text: `Muted thread notifications ${duration === "always" ? "indefinitely" : `for ${duration} minute(s)`}. Messenger has no per-member mute API, so this silences the whole thread for the bot account; a moderation record for ${target} was stored. Reason: ${reason}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!mute <userId> [minutes|always] [reason]"],
    examples: ["!mute 123456789 60 Spam wave", "!mute 123456789 always"],
    permission: "admin",
    cooldownMs: 3000,
  },
);
