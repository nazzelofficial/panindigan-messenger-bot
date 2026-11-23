import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function parseHttpUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function dimension(value: string | undefined, fallback: number, maximum: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : fallback;
}

function weservUrl(source: string, parameters: Readonly<Record<string, string>>): string {
  const url = new URL("https://images.weserv.nl/");
  url.searchParams.set("url", source);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}

export default createCommand(
  {
    name: "resize",
    description: "Build a real wsrv.nl resize URL with explicit width and height.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const source = parseHttpUrl(context.args.positional[0]);
      if (!source)
        return {
          text: "Usage: !resize <direct image URL> <width> <height>. Both dimensions must be 1-4096.",
        };
      const width = dimension(context.args.positional[1], 800, 4096);
      const height = dimension(context.args.positional[2], 600, 4096);
      const url = weservUrl(source.toString(), {
        w: String(width),
        h: String(height),
        fit: "inside",
      });
      return {
        text: `📐 Resized to at most ${width}×${height} (aspect ratio preserved):\n${url}\n\nProcessed by images.weserv.nl when opened.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!resize <image URL> <width> <height>"],
    examples: ["!resize https://example.org/photo.jpg 800 600"],
    permission: "public",
    cooldownMs: 2000,
  },
);
