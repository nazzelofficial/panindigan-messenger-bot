import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "reactions",
    description: "Display the exact auto-reaction configuration for this thread.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const settings = await context.services.automation.settings(context.threadId);
      const emoji = settings["auto_react_emoji"];
      const configured = emoji !== null && emoji !== undefined && emoji !== "";
      return {
        text: configured
          ? `This thread's auto-reaction emoji is ${String(emoji)}. Use !addreaction <emoji> to replace it or !removereaction to turn it off.`
          : "This thread has no auto-reaction emoji configured. Use !addreaction <emoji> to set one.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!reactions"],
    examples: ["!reactions"],
    permission: "admin",
    cooldownMs: 1000,
  },
);
