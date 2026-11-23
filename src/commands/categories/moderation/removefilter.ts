import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "removefilter",
    description: "Remove a filtered word from this group.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const word = context.args.positional[0]?.trim();
      if (!word) return { text: "Usage: !removefilter <word>" };
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      const removed = await context.services.moderation.removeFilter(group, word);
      if (!removed) return { text: `"${word.toLowerCase()}" is not in this group's filter list.` };
      await context.services.moderation.recordAction(
        group,
        "removefilter",
        word,
        context.senderId,
        "Filter removed",
      );
      return { text: `Removed "${word.toLowerCase()}" from this group's filter list.` };
    },
  },
  {
    aliases: [],
    usage: ["!removefilter <word>"],
    examples: ["!removefilter spam"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
