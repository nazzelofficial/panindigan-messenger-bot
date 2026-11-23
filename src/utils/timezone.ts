const CACHE = new Map<string, boolean>();

/** Validates an IANA timezone identifier using the runtime's own ICU data. */
export function isValidTimeZone(timeZone: string): boolean {
  const cached = CACHE.get(timeZone);
  if (cached !== undefined) return cached;
  let valid = true;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    valid = false;
  }
  CACHE.set(timeZone, valid);
  return valid;
}

/**
 * Minimal, deterministic five-field cron matcher used by scheduled restart.
 * Supports wildcards, step values, comma-separated values and inclusive ranges.
 */
export interface CronSchedule {
  minutes: ReadonlySet<number>;
  hours: ReadonlySet<number>;
  daysOfMonth: ReadonlySet<number>;
  months: ReadonlySet<number>;
  daysOfWeek: ReadonlySet<number>;
}

function parseField(field: string, minimum: number, maximum: number): Set<number> {
  const values = new Set<number>();
  for (const segment of field.split(",")) {
    if (!segment) throw new Error("Empty cron field.");
    if (segment === "*") {
      for (let i = minimum; i <= maximum; i += 1) values.add(i);
      continue;
    }
    const stepMatch = /^(\*|\d+(?:-\d+)?)\/(\d+)$/.exec(segment);
    if (stepMatch) {
      const step = Number(stepMatch[2]);
      if (step < 1) throw new Error("Cron step must be at least 1.");
      const source = stepMatch[1]!;
      const range: [number, number] =
        source === "*" ? [minimum, maximum] : parseRange(source, minimum, maximum);
      for (let index = range[0]; index <= range[1]; index += step) values.add(index);
      continue;
    }
    const [start, end] = parseRange(segment, minimum, maximum);
    for (let i = start; i <= end; i += 1) values.add(i);
  }
  return values;
}

function parseRange(segment: string, minimum: number, maximum: number): [number, number] {
  const parts = segment.split("-");
  if (parts.length > 2) throw new Error(`Invalid cron range "${segment}".`);
  const start = Number(parts[0]);
  const end = parts[1] === undefined ? start : Number(parts[1]);
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error(`Invalid cron value "${segment}".`);
  }
  if (start < minimum || end > maximum || start > end) {
    throw new Error(`Cron value "${segment}" is out of range.`);
  }
  return [start, end];
}

export function parseCron(expression: string): CronSchedule {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("Cron expression must have five fields.");
  return {
    minutes: parseField(fields[0]!, 0, 59),
    hours: parseField(fields[1]!, 0, 23),
    daysOfMonth: parseField(fields[2]!, 1, 31),
    months: parseField(fields[3]!, 1, 12),
    daysOfWeek: parseField(fields[4]!, 0, 6),
  };
}

export function cronMatches(schedule: CronSchedule, epochMs: number, timeZone: string): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(epochMs));
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdays[get("weekday")] ?? 0;
  return (
    schedule.minutes.has(Number(get("minute"))) &&
    schedule.hours.has(Number(get("hour"))) &&
    schedule.daysOfMonth.has(Number(get("day"))) &&
    schedule.months.has(Number(get("month"))) &&
    schedule.daysOfWeek.has(dayOfWeek)
  );
}
