import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "report",
    description: "File a moderation report against a member for administrators to review.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0];
      if (!target || !/^\d{4,25}$/.test(target)) {
        return {
          text: context.isReply
            ? "Reply targeting is not available: the replied-to sender ID is not exposed to commands. Provide an explicit numeric user ID."
            : "Usage: !report <userId> <reason>",
        };
      }
      const reason = context.args.positional.slice(1).join(" ").trim();
      if (!reason) return { text: "Please include a reason: !report <userId> <reason>" };
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group))
        return { text: "This thread has no numeric group id, so the report was not filed." };
      const id = await context.services.moderation.addReport(
        group,
        context.senderId,
        target,
        reason,
      );
      return { text: `Report #${id} filed against ${target}. Reason: ${reason}` };
    },
  },
  {
    aliases: [],
    usage: ["!report <userId> <reason>"],
    examples: ["!report 123456789 Posting scam links"],
    permission: "public",
    cooldownMs: 4000,
  },
);
