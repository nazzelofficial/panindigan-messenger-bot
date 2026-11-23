import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function targetId(context: CommandContext): string | null {
  const candidate = context.args.positional[0];
  return candidate !== undefined && /^\d{4,25}$/.test(candidate) ? candidate : null;
}

function groupId(context: CommandContext): number | null {
  const value = Number(context.threadId);
  return Number.isSafeInteger(value) ? value : null;
}

function targetError(context: CommandContext): CommandResult {
  return {
    text: context.isReply
      ? "Reply targeting is not available: the replied-to sender ID is not exposed to commands. Provide an explicit numeric user ID (4–25 digits)."
      : "Provide a valid numeric Facebook user ID (4–25 digits).",
  };
}

export default createCommand(
  {
    name: "warn",
    description: "Issue a formal warning to a member and store it in the moderation log.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = targetId(context);
      if (target === null) return targetError(context);
      const group = groupId(context);
      if (group === null)
        return { text: "This thread has no numeric group id, so warnings cannot be stored." };
      const reason = context.args.positional.slice(1).join(" ").trim();
      if (!reason) return { text: "Usage: !warn <userId> <reason>" };
      await context.services.moderation.addWarning(group, target, context.senderId, reason);
      await context.services.moderation.recordAction(
        group,
        "warn",
        target,
        context.senderId,
        reason,
      );
      const active = await context.services.moderation.warnings(target, group);
      return {
        text: `Warning recorded for ${target}. Reason: ${reason}\nActive warnings now: ${active.length}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!warn <userId> <reason>"],
    examples: ["!warn 123456789 Spamming the chat"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
