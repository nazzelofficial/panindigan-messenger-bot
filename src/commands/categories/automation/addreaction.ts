import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "addreaction",
    description: "Configure the emoji used for automatic reactions in this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const emoji = context.args.positional[0]?.trim();
      if (!emoji) return { text: "Usage: !addreaction <emoji>" };
      if (emoji.length > 16) return { text: "The emoji value must be 16 characters or fewer." };
      await context.services.automation.updateSettings(context.threadId, {
        auto_react_emoji: emoji,
      });
      await context.services.automation.recordRun(context.threadId, "addreaction", { emoji });
      return {
        text: `Automatic reaction emoji set to ${emoji}. This configures future auto-reactions; it does not react to this message.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!addreaction <emoji>"],
    examples: ["!addreaction 👍", "!addreaction ❤️"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
