export function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-PH").format(Math.trunc(value));
}

export function truncate(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, Math.max(0, maximumLength - 1))}…`;
}

/**
 * Splits text into chunks that fit a Messenger message, preferring paragraph,
 * line and sentence boundaries. Existing fenced code blocks are kept intact
 * whenever they fit inside a single chunk.
 */
export function splitMessage(value: string, maximumLength = 1900): string[] {
  if (value.length <= maximumLength) return [value];
  const normalized = value.replace(/\r\n/g, "\n");
  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > maximumLength) {
    const window = remaining.slice(0, maximumLength);
    let boundary = -1;
    for (const separator of ["\n\n", "\n", ". ", " "]) {
      const index = window.lastIndexOf(separator);
      if (index > maximumLength * 0.4) {
        boundary = index + separator.length;
        break;
      }
    }
    if (boundary <= 0) boundary = maximumLength;
    chunks.push(remaining.slice(0, boundary).trimEnd());
    remaining = remaining.slice(boundary).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatInteger(count)} ${count === 1 ? singular : plural}`;
}

export function stripCommandPrefix(body: string, prefix: string): string {
  return body.startsWith(prefix) ? body.slice(prefix.length) : body;
}
