import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatDuration } from "../../../utils/time.js";

export default createCommand(
  {
    name: "uptime",
    description: "Show how long the process has been running.",
    category: "administration",
    async run(_context: CommandContext): Promise<CommandResult> {
      return { text: "⏱️ Uptime: " + formatDuration(process.uptime() * 1000) };
    },
  },
  {
    aliases: [],
    usage: ["!uptime"],
    examples: ["!uptime"],
    permission: "public",
    cooldownMs: 800,
    maintenanceSafe: true,
  },
);
