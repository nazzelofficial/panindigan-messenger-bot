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
    name: "crop",
    description: "Build a real wsrv.nl cover-crop URL centred on the detected subject.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const source = parseHttpUrl(context.args.positional[0]);
      if (!source) return { text: "Usage: !crop <direct image URL> <width> <height>." };
      const width = dimension(context.args.positional[1], 400, 4096);
      const height = dimension(context.args.positional[2], 400, 4096);
      const url = weservUrl(source.toString(), {
        w: String(width),
        h: String(height),
        fit: "cover",
        a: "attention",
      });
      return {
        text: `✂️ Cover crop to ${width}×${height} with attention alignment:\n${url}\n\nProcessed by images.weserv.nl when opened.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!crop <image URL> <width> <height>"],
    examples: ["!crop https://example.org/photo.jpg 400 400"],
    permission: "public",
    cooldownMs: 2000,
  },
);
