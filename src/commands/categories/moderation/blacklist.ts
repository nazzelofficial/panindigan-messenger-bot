import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "blacklist",
    description: "Add a user or group id to the persistent moderation blacklist.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const scope = context.args.positional[0]?.toLowerCase();
      if (scope !== "user" && scope !== "group") {
        return { text: "Usage: !blacklist <user|group> <numericId> [reason]" };
      }
      const value = context.args.positional[1];
      if (!value || !/^\d{4,25}$/.test(value)) {
        return { text: "Provide a numeric Facebook id (4–25 digits)." };
      }
      const reason = context.args.positional.slice(2).join(" ").trim() || "No reason given";
      await context.services.moderation.addBlacklist(scope, value, reason, context.senderId);
      const group = Number(context.threadId);
      if (Number.isSafeInteger(group)) {
        await context.services.moderation.recordAction(
          group,
          "blacklist",
          value,
          context.senderId,
          reason,
        );
      }
      return { text: `Added ${scope} ${value} to the blacklist. Reason: ${reason}` };
    },
  },
  {
    aliases: [],
    usage: ["!blacklist <user|group> <numericId> [reason]"],
    examples: ["!blacklist user 123456789 Scam accounts"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
