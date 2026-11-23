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

function bounded(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function weservUrl(source: string, parameters: Readonly<Record<string, string>>): string {
  const url = new URL("https://images.weserv.nl/");
  url.searchParams.set("url", source);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}

export default createCommand(
  {
    name: "compress",
    description: "Build a real wsrv.nl URL with a chosen output format and quality.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const source = parseHttpUrl(context.args.positional[0]);
      if (!source)
        return {
          text: "Usage: !compress <direct image URL> [quality 1-100] [output: jpeg|png|webp].",
        };
      const quality = bounded(context.args.positional[1], 75, 1, 100);
      const requestedOutput = (context.args.positional[2] ?? "").toLowerCase();
      const output = ["jpeg", "png", "webp"].includes(requestedOutput) ? requestedOutput : "webp";
      const url = weservUrl(source.toString(), { q: String(quality), output, il: "true" });
      return {
        text: `🗜️ Compressed ${output} at quality ${quality}:\n${url}\n\nProcessed by images.weserv.nl when opened. The command returns the real processed URL rather than re-encoding locally.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!compress <image URL> [quality] [output]"],
    examples: ["!compress https://example.org/photo.jpg 70 webp"],
    permission: "public",
    cooldownMs: 2000,
  },
);
