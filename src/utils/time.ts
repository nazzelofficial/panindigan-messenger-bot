import { isValidTimeZone } from "./timezone.js";

export const DEFAULT_TIMEZONE = "Asia/Manila";

export interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseDate(value: string): { year: number; month: number; day: number } {
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid date "${value}". Expected YYYY-MM-DD.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${value}".`);
  }
  return { year, month, day };
}

export function parseTime(value: string): { hour: number; minute: number } {
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid time "${value}". Expected HH:mm (24-hour).`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function offsetAt(epochMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(epochMs));
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

/**
 * Converts a wall-clock date and time in `timeZone` to UTC epoch milliseconds.
 * The offset is resolved in two passes so daylight-saving boundaries are handled.
 */
export function zonedDateTimeToEpoch(
  date: string,
  time: string,
  timeZone: string = DEFAULT_TIMEZONE,
): number {
  if (!isValidTimeZone(timeZone)) throw new Error(`Unknown timezone "${timeZone}".`);
  const { year, month, day } = parseDate(date);
  const { hour, minute } = parseTime(time);
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = offsetAt(naiveUtc, timeZone);
  const firstGuess = naiveUtc - firstOffset;
  const secondOffset = offsetAt(firstGuess, timeZone);
  const result = naiveUtc - secondOffset;
  const verify = offsetAt(result, timeZone);
  return result + (secondOffset - verify);
}

export function formatDateTime(
  epochMs: number,
  timeZone: string = DEFAULT_TIMEZONE,
  locale = "en-PH",
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(epochMs));
}

export function formatDate(epochMs: number, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(epochMs));
}

export function formatTime(epochMs: number, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(epochMs));
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds <= 0) return "less than a minute";
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes && !days) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return parts.join(" ") || "less than a minute";
}

export function nowEpoch(): number {
  return Date.now();
}
