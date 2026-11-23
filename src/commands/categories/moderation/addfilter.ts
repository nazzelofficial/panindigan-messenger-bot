import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

const ACTIONS = new Set(["warn", "delete", "mute", "kick"]);

export default createCommand(
  {
    name: "addfilter",
    description: "Add a filtered word to this group with the action to take when it appears.",
    category: "moderation",
    async run(context: CommandContext): Promise<CommandResult> {
      const word = context.args.positional[0]?.trim();
      if (!word) return { text: "Usage: !addfilter <word> [warn|delete|mute|kick]" };
      const action = context.args.positional[1]?.toLowerCase() ?? "warn";
      if (!ACTIONS.has(action)) return { text: "Action must be one of: warn, delete, mute, kick." };
      const group = Number(context.threadId);
      if (!Number.isSafeInteger(group)) return { text: "This thread has no numeric group id." };
      await context.services.moderation.addFilter(group, word, action, context.senderId);
      await context.services.moderation.recordAction(
        group,
        "addfilter",
        word,
        context.senderId,
        action,
      );
      return { text: `Filtered word "${word.toLowerCase()}" saved with action "${action}".` };
    },
  },
  {
    aliases: [],
    usage: ["!addfilter <word> [warn|delete|mute|kick]"],
    examples: ["!addfilter spam warn", "!addfilter badword delete"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
