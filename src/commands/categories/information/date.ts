import { DEFAULT_TIMEZONE, formatDate, formatDateTime, parseDate } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "date",
    description: "Show today's date in Asia/Manila or validate a supplied YYYY-MM-DD date.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const input = context.args.positional[0];
      if (input) {
        try {
          const parsed = parseDate(input);
          const epoch = Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12);
          return { text: `Valid date: ${formatDate(epoch, DEFAULT_TIMEZONE)} (${input})` };
        } catch (error) {
          return {
            text: `Invalid date: ${error instanceof Error ? error.message : "unknown error"}`,
          };
        }
      }
      const now = Date.now();
      return {
        text: `Date (${DEFAULT_TIMEZONE}): ${formatDate(now, DEFAULT_TIMEZONE)}\nNow: ${formatDateTime(now, DEFAULT_TIMEZONE)}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!date", "!date YYYY-MM-DD"],
    examples: ["!date", "!date 2026-12-25"],
    permission: "public",
    cooldownMs: 1000,
  },
);
