import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "unblacklist",
    description: "Remove a user or group id from the persistent moderation blacklist.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const scope = context.args.positional[0]?.toLowerCase();
      if (scope !== "user" && scope !== "group") {
        return { text: "Usage: !unblacklist <user|group> <numericId>" };
      }
      const value = context.args.positional[1];
      if (!value || !/^\d{4,25}$/.test(value)) {
        return { text: "Provide a numeric Facebook id (4–25 digits)." };
      }
      const removed = await context.services.moderation.removeBlacklist(scope, value);
      if (!removed)
        return { text: `${scope} ${value} was not on the blacklist; nothing was changed.` };
      const group = Number(context.threadId);
      if (Number.isSafeInteger(group)) {
        await context.services.moderation.recordAction(
          group,
          "unblacklist",
          value,
          context.senderId,
          "Blacklist entry removed",
        );
      }
      return { text: `Removed ${scope} ${value} from the blacklist.` };
    },
  },
  {
    aliases: [],
    usage: ["!unblacklist <user|group> <numericId>"],
    examples: ["!unblacklist user 123456789"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
