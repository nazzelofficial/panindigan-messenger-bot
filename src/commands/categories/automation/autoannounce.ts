import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "autoannounce",
    description: "Check whether automatic announcements are enabled for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const settings = await context.services.automation.settings(context.threadId);
      const enabled = settings["announcement_enabled"] === true;
      return {
        text: `Auto-announcements are ${enabled ? "enabled" : "disabled"} in this thread. Toggle with !setannounce on|off.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!autoannounce"],
    examples: ["!autoannounce"],
    permission: "admin",
    cooldownMs: 1000,
  },
);
