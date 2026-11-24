/**
 * Shared response formatter for Messenger replies.
 *
 * A single, consistent visual language for command output — clean box panels
 * with small caps headers, aligned key/value rows, and subtle dividers. No
 * ANSI codes (Messenger renders plain text); the look comes from Unicode box
 * characters and spacing. This is the bot-side equivalent of the library's
 * console panels, adapted for a chat surface.
 */

export type Tone = "info" | "success" | "warning" | "danger";

const TONE_ICON: Record<Tone, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  danger: "✖",
};

const DEFAULT_WIDTH = 34;
const MIN_WIDTH = 24;
const MAX_WIDTH = 46;

/** Visible length accounting for wide/emoji code points. */
function visualLength(text: string): number {
  return [...text].length;
}

/**
 * Builds a bordered box sized to its longest line. `pad` uses a captured
 * width so every row in one panel lines up, and long subtitles/footers widen
 * the whole panel instead of spilling past the border.
 */
function makeBox(width: number) {
  const pad = (text: string): string => text + " ".repeat(Math.max(0, width - visualLength(text)));
  return {
    line: (content: string): string => `│ ${pad(content)} │`,
    top: `╔${"═".repeat(width + 2)}╗`,
    div: `╠${"═".repeat(width + 2)}╣`,
    bottom: `╚${"═".repeat(width + 2)}╝`,
  };
}

export interface PanelOptions {
  readonly title: string;
  readonly tone?: Tone;
  readonly subtitle?: string;
  /** Rows rendered as `label  value`, aligned. */
  readonly rows?: ReadonlyArray<readonly [string, string | number]>;
  /** Plain lines rendered verbatim inside the body. */
  readonly lines?: readonly string[];
  readonly footer?: string;
}

/** Builds a boxed panel reply, auto-sized to its longest content line. */
export function panel(options: PanelOptions): string {
  const icon = TONE_ICON[options.tone ?? "info"];

  const rowLines: string[] = [];
  if (options.rows && options.rows.length > 0) {
    const labelWidth = Math.max(...options.rows.map(([label]) => visualLength(label)));
    for (const [label, value] of options.rows) {
      const paddedLabel = label + " ".repeat(Math.max(0, labelWidth - visualLength(label)));
      rowLines.push(`${paddedLabel}  ${value}`.trimEnd());
    }
  }
  const bodyLines = options.lines ? [...options.lines] : [];
  const header = `${icon} ${options.title.toUpperCase()}`;

  // Every line that will be framed, so the box fits all of them.
  const allContent = [header, ...(options.subtitle ? [options.subtitle] : []), ...rowLines, ...bodyLines, ...(options.footer ? [options.footer] : [])];
  const longest = Math.max(DEFAULT_WIDTH, ...allContent.map(visualLength));
  const width = Math.min(Math.max(MIN_WIDTH, longest), MAX_WIDTH);
  // For content beyond MAX_WIDTH, wrap-free truncate so it never spills.
  const fit = (text: string): string => visualLength(text) > width ? `${[...text].slice(0, width - 1).join("")}…` : text;

  const box = makeBox(width);
  const out: string[] = [box.top, box.line(header)];
  if (options.subtitle) out.push(box.div, box.line(fit(options.subtitle)));
  if (rowLines.length > 0) {
    out.push(box.div);
    for (const row of rowLines) out.push(box.line(fit(row)));
  }
  if (bodyLines.length > 0) {
    out.push(box.div);
    for (const text of bodyLines) out.push(box.line(fit(text)));
  }
  if (options.footer) out.push(box.div, box.line(fit(options.footer)));
  out.push(box.bottom);
  return out.join("\n");
}

/** A titled section for bullet-like lists inside a panel body. */
export function bullet(label: string, value: string | number): string {
  const labelWidth = 18;
  const padded = label + " ".repeat(Math.max(0, labelWidth - [...label].length));
  return `▸ ${padded} ${value}`;
}
