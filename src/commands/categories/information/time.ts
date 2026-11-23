import { DEFAULT_TIMEZONE, formatDateTime, formatTime, nowEpoch } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "time",
    description: "Show the current clock time in the Asia/Manila timezone.",
    category: "information",
    async run(_context: CommandContext): Promise<CommandResult> {
      const now = nowEpoch();
      return {
        text: `Time (${DEFAULT_TIMEZONE}): ${formatTime(now, DEFAULT_TIMEZONE)}\nFull: ${formatDateTime(now, DEFAULT_TIMEZONE)}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!time"],
    examples: ["!time"],
    permission: "public",
    cooldownMs: 1000,
  },
);
