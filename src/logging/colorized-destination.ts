import { Writable } from "node:stream";

/**
 * Panindigan Messenger Bot — dedicated colorized console renderer.
 *
 * Its own visual identity, deliberately distinct from the library's logger:
 *   - bracketed timestamp with milliseconds   [06:08:04.123]
 *   - solid background "pill" level badge      ▌ INFO ▐
 *   - diamond brand mark                       ◆
 *   - corner-bracketed module                  ⟦DISPATCHER⟧
 *   - bright message, dim structured context   · key=value
 *
 * Pino applies redaction BEFORE handing us the line, so coloring is safe.
 * Never emits raw JSON. No pino-pretty and no TTY required — identical on a
 * local shell and in a hosted log viewer.
 */

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  white: "\x1b[38;5;255m",
  gray: "\x1b[38;5;245m",
  darkGray: "\x1b[38;5;240m",
  green: "\x1b[38;5;42m",
  yellow: "\x1b[38;5;214m",
  red: "\x1b[38;5;203m",
  cyan: "\x1b[38;5;45m",
  purple: "\x1b[38;5;141m",
  pink: "\x1b[38;5;213m",
  // pill backgrounds
  bgRed: "\x1b[48;5;196m",
  bgYellow: "\x1b[48;5;214m",
  bgGreen: "\x1b[48;5;35m",
  bgBlue: "\x1b[48;5;25m",
  bgGray: "\x1b[48;5;240m",
  onDark: "\x1b[30m",
} as const;

interface Style { pill: string; icon: string; }

const LEVELS: Record<number, Style> = {
  60: { pill: `${C.bgRed}${C.bold}${C.white}`, icon: "✖" },
  50: { pill: `${C.bgRed}${C.bold}${C.white}`, icon: "✖" },
  40: { pill: `${C.bgYellow}${C.bold}${C.onDark}`, icon: "⚠" },
  30: { pill: `${C.bgGreen}${C.bold}${C.onDark}`, icon: "ℹ" },
  20: { pill: `${C.bgBlue}${C.bold}${C.white}`, icon: "●" },
  10: { pill: `${C.bgGray}${C.bold}${C.white}`, icon: "›" },
};

const LABELS: Record<number, string> = {
  60: "FATAL", 50: "ERROR", 40: "WARN", 30: "INFO", 20: "DEBUG", 10: "TRACE",
};

/** `[06:08:04.123]` — 24-hour with milliseconds, unlike the library's 12-hour clock. */
function clock(raw: unknown): string {
  const d = typeof raw === "number" || typeof raw === "string" ? new Date(raw) : new Date();
  if (Number.isNaN(d.getTime())) return "[--:--:--.---]";
  const pad = (n: number, len = 2): string => String(n).padStart(len, "0");
  return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}]`;
}

function colorValue(value: unknown): string {
  if (typeof value === "boolean") return value ? C.green : C.red;
  if (typeof value === "number") return C.yellow;
  const text = String(value ?? "");
  if (/^(connected|ready|enabled|active|ok|true|online|success)$/i.test(text)) return C.green;
  if (/^(disconnected|halted|down|false|offline|error|failed)$/i.test(text)) return C.red;
  if (/^https?:\/\//i.test(text)) return C.cyan;
  return C.pink;
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_k, item: unknown) => {
      if (item !== null && typeof item === "object") {
        if (seen.has(item)) return "[Circular]";
        seen.add(item);
      }
      return item;
    }) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Renders one pino JSON line into the bot's own colored console format. */
export function renderLogLine(line: string): string {
  const trimmed = line.trim();
  if (trimmed === "") return "";
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return line;
  }

  const level = typeof record["level"] === "number" ? record["level"] : 30;
  const style = LEVELS[level] ?? { pill: `${C.bgGray}${C.bold}${C.white}`, icon: "•" };
  const label = LABELS[level] ?? "LOG";

  const module = typeof record["module"] === "string" ? record["module"].toUpperCase()
    : typeof record["component"] === "string" ? record["component"].toUpperCase() : undefined;
  const msg = typeof record["msg"] === "string" ? record["msg"] : "";

  const parts = [
    `${C.darkGray}${clock(record["time"])}${C.reset}`,
    `${style.pill} ${style.icon} ${label.padEnd(5)} ${C.reset}`,
    `${C.purple}◆${C.reset}`,
    module ? `${C.cyan}⟦${module}⟧${C.reset}` : "",
    msg ? `${C.white}${msg}${C.reset}` : "",
  ].filter((p) => p !== "");
  let out = parts.join(" ");

  const reserved = new Set([
    "level", "time", "msg", "name", "library", "pid", "hostname", "module", "component", "err", "service", "environment",
  ]);
  const context = Object.entries(record).filter(([k]) => !reserved.has(k));
  if (context.length > 0) {
    out += `  ${C.darkGray}${C.italic}·${C.reset} ` + context.map(([k, v]) => {
      const text = typeof v === "string" ? v : safeStringify(v);
      const short = text.length > 160 ? `${text.slice(0, 157)}...` : text;
      return `${C.gray}${k}${C.reset}${C.darkGray}=${colorValue(v)}${short}${C.reset}`;
    }).join(` ${C.darkGray}·${C.reset} `);
  }

  const err = record["err"];
  if (err !== null && typeof err === "object") {
    const errObj = err as Record<string, unknown>;
    const text = typeof errObj["message"] === "string" ? errObj["message"] : safeStringify(errObj);
    out += `  ${C.darkGray}err${C.reset}=${C.red}${text}${C.reset}`;
    if (typeof errObj["stack"] === "string") {
      for (const stackLine of errObj["stack"].split("\n")) {
        out += `\n      ${C.dim}${stackLine}${C.reset}`;
      }
    }
  }
  return `${out}\n`;
}

/** Pino destination stream that colorizes every line instead of writing JSON. */
export function createColorizedDestination(): Writable {
  return new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      process.stdout.write(renderLogLine(String(chunk)));
      callback();
    },
  });
}
