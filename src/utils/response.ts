/**
 * Shared response formatter for Messenger replies.
 *
 * Messenger's font does NOT render double-line box drawing (╔ ═ ║ ╠ ╚) — the
 * glyphs break apart into scattered fragments. It also uses a proportional
 * font, so space-padded columns never align. This formatter therefore uses
 * ONLY Messenger-safe characters: emoji, the single horizontal rule "─", and
 * simple bullets. No box borders, no column padding — the layout survives
 * any device and renders cleanly.
 */

export type Tone = "info" | "success" | "warning" | "danger";

const TONE_ICON: Record<Tone, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  danger: "❌",
};

const RULE = "─".repeat(28);

export interface PanelOptions {
  readonly title: string;
  readonly tone?: Tone;
  readonly subtitle?: string;
  /** Each entry renders as `label: value` on one clean line. */
  readonly rows?: ReadonlyArray<readonly [string, string | number]>;
  /** Plain lines rendered verbatim (use `listItem` for bullets). */
  readonly lines?: readonly string[];
  readonly footer?: string;
}

/** Builds a clean, Messenger-safe card reply. */
export function panel(options: PanelOptions): string {
  const icon = TONE_ICON[options.tone ?? "info"];
  const out: string[] = [`${icon} ${options.title.toUpperCase()}`, RULE];
  if (options.subtitle) out.push(options.subtitle, RULE);
  if (options.rows && options.rows.length > 0) {
    for (const [label, value] of options.rows) {
      out.push(label ? `${label}: ${value}` : String(value));
    }
    out.push(RULE);
  }
  if (options.lines && options.lines.length > 0) {
    out.push(...options.lines);
    if (options.footer) out.push(RULE);
  }
  if (options.footer) out.push(options.footer);
  return out.join("\n");
}

/** A single bullet line — no padding, just a marker and text. */
export function bullet(label: string, value: string | number): string {
  return `▸ ${label} — ${value}`;
}

/** A compact list item with an emoji marker. */
export function listItem(emoji: string, text: string): string {
  return `${emoji} ${text}`;
}
