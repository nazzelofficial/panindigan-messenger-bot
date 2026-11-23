import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatDuration } from "../../../utils/time.js";
import { getOnlineSince } from "../../../utils/online-since.js";

export default createCommand(
  {
    name: "uptime",
    description: "Show how long the bot has been continuously online.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const since = await getOnlineSince(context.databases);
      const online = Math.max(0, Date.now() - since);
      return {
        text:
          "⏱️ Uptime: " + formatDuration(online) +
          "\n🖥️ Process: " + formatDuration(process.uptime() * 1000),
      };
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
