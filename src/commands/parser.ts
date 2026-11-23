import type { ParsedArguments } from "./types.js";

/** Parses a command body into positional and `--name=value` arguments. */
export function parseCommandBody(
  body: string,
  prefix: string,
  ignoreCase: boolean,
): ParsedArguments | undefined {
  const trimmed = body.trim();
  if (!trimmed.startsWith(prefix)) return undefined;
  const withoutPrefix = trimmed.slice(prefix.length).trim();
  if (!withoutPrefix) return undefined;
  const tokens = withoutPrefix.split(/\s+/).filter((token) => token.length > 0);
  if (tokens.length === 0) return undefined;

  const rawName = tokens.shift()!;
  const name = ignoreCase ? rawName.toLowerCase() : rawName;
  const positional: string[] = [];
  const named: Record<string, string> = {};
  for (const token of tokens) {
    if (token.startsWith("--") && token.includes("=")) {
      const separator = token.indexOf("=");
      const key = token.slice(2, separator);
      if (key) named[key] = token.slice(separator + 1);
      continue;
    }
    positional.push(token);
  }
  return { name, positional, named, raw: withoutPrefix };
}
