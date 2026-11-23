import { DEFAULT_TIMEZONE, parseDate } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function manilaToday(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

export default createCommand(
  {
    name: "calendar",
    description: "Render a monthly calendar grid for Asia/Manila, marking today with an asterisk.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const today = manilaToday();
      let year = today.year;
      let month = today.month;
      const input = context.args.positional[0];
      if (input) {
        try {
          const normalized = /^\d{4}-\d{2}$/.test(input) ? `${input}-01` : input;
          const parsed = parseDate(normalized);
          year = parsed.year;
          month = parsed.month;
        } catch (error) {
          return {
            text: `Calendar date error: ${error instanceof Error ? error.message : "unknown error"}`,
          };
        }
      }
      const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const cells: string[] = [];
      for (let offset = 0; offset < firstWeekday; offset += 1) cells.push("   ");
      for (let day = 1; day <= daysInMonth; day += 1) {
        const isToday = day === today.day && month === today.month && year === today.year;
        cells.push(`${String(day).padStart(2, " ")}${isToday ? "*" : " "}`);
      }
      const lines: string[] = [];
      for (let index = 0; index < cells.length; index += 7)
        lines.push(cells.slice(index, index + 7).join(" "));
      const monthLabel = new Intl.DateTimeFormat("en-PH", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(year, month - 1, 1)));
      return {
        text: `${monthLabel} (${DEFAULT_TIMEZONE}) — * = today\nSu Mo Tu We Th Fr Sa\n${lines.join("\n")}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!calendar", "!calendar YYYY-MM"],
    examples: ["!calendar", "!calendar 2026-12"],
    permission: "public",
    cooldownMs: 1000,
  },
);
