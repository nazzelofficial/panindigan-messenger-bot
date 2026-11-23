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
    name: "thumbnail",
    description: "Build a real wsrv.nl thumbnail URL for a direct image URL.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const source = parseHttpUrl(context.args.positional[0]);
      if (!source)
        return {
          text: "Usage: !thumbnail <direct image URL> [size]. Example: !thumbnail https://site.com/pic.jpg 320",
        };
      const size = dimension(context.args.positional[1], 320, 2000);
      const url = weservUrl(source.toString(), {
        w: String(size),
        h: String(size),
        fit: "cover",
        a: "attention",
      });
      return {
        text: `🖼️ Thumbnail (${size}×${size}, crop on attention):\n${url}\n\nProcessed by the public images.weserv.nl service when the URL is opened.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!thumbnail <image URL> [size]"],
    examples: ["!thumbnail https://example.org/photo.jpg 256"],
    permission: "public",
    cooldownMs: 2000,
  },
);
