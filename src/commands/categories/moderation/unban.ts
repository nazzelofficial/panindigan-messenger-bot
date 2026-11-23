import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "unban",
    description:
      "Explain why a removed member cannot be unbanned and check their current thread status.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0];
      if (!target || !/^\d{4,25}$/.test(target)) {
        return { text: "Usage: !unban <userId>" };
      }
      const thread = await context.messenger.getThread(context.threadId);
      const present = thread?.participantIds.includes(target) ?? false;
      return {
        text: present
          ? `${target} is currently a participant of this thread. Messenger has no unban API and no ban list to clear; no changes were made.`
          : `${target} is not in this thread. Messenger has no unban API — a removed member must be re-added to the group by an admin. No changes were made.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!unban <userId>"],
    examples: ["!unban 123456789"],
    permission: "admin",
    cooldownMs: 1500,
  },
);
