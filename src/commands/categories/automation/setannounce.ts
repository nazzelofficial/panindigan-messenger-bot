import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "setannounce",
    description: "Enable or disable automatic announcements in this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const value = context.args.positional[0]?.toLowerCase();
      if (value !== "on" && value !== "off" && value !== "true" && value !== "false") {
        return { text: "Usage: !setannounce <on|off>" };
      }
      const enabled = value === "on" || value === "true";
      await context.services.automation.updateSettings(context.threadId, {
        announcement_enabled: enabled,
      });
      await context.services.automation.recordRun(context.threadId, "setannounce", { enabled });
      return { text: `Auto-announcements ${enabled ? "enabled" : "disabled"} for this thread.` };
    },
  },
  {
    aliases: [],
    usage: ["!setannounce <on|off>"],
    examples: ["!setannounce on", "!setannounce off"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
