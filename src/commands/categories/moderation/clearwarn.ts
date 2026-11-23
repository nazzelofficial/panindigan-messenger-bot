import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "clearwarn",
    description: "Clear all active warnings for a member in this group.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const candidate = context.args.positional[0];
      if (!candidate || !/^\d{4,25}$/.test(candidate)) {
        return {
          text: context.isReply
            ? "Reply targeting is not available: the replied-to sender ID is not exposed to commands. Provide an explicit numeric user ID."
            : "Usage: !clearwarn <userId>",
        };
      }
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const cleared = await context.services.moderation.clearWarnings(candidate, group);
      await context.services.moderation.recordAction(
        group,
        "clearwarn",
        candidate,
        context.senderId,
        `${cleared} warnings cleared`,
      );
      return {
        text:
          cleared > 0
            ? `Cleared ${cleared} active warning${cleared === 1 ? "" : "s"} for ${candidate}.`
            : `No active warnings were found for ${candidate}; nothing was changed.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!clearwarn <userId>"],
    examples: ["!clearwarn 123456789"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
