import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "removereaction",
    description: "Disable automatic reactions by clearing the configured emoji in this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const settings = await context.services.automation.settings(context.threadId);
      const current = settings["auto_react_emoji"];
      if (current === null || current === undefined || current === "") {
        return { text: "Automatic reactions are already disabled in this thread." };
      }
      await context.services.automation.updateSettings(context.threadId, {
        auto_react_emoji: null,
      });
      await context.services.automation.recordRun(context.threadId, "removereaction", {
        previous: String(current),
      });
      return {
        text: `Cleared the auto-reaction emoji (was ${String(current)}). Automatic reactions are now off.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!removereaction"],
    examples: ["!removereaction"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
