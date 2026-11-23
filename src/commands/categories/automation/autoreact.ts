import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "autoreact",
    description: "Check whether automatic reactions are enabled and which emoji is configured.",
    category: "automation",
    async run(context: CommandContext): Promise<CommandResult> {
      const settings = await context.services.automation.settings(context.threadId);
      const emoji = settings["auto_react_emoji"];
      const enabled = emoji !== null && emoji !== undefined && emoji !== "";
      return {
        text: [
          `Auto-reactions: ${enabled ? "enabled" : "disabled"}`,
          `Configured emoji: ${enabled ? String(emoji) : "none"}`,
          enabled
            ? "Change it with !addreaction <emoji> or disable it with !removereaction."
            : "Enable it with !addreaction <emoji>.",
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!autoreact"],
    examples: ["!autoreact"],
    permission: "admin",
    cooldownMs: 1000,
  },
);
