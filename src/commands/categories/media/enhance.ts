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
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function weservUrl(source: string, parameters: Readonly<Record<string, string>>): string {
  const url = new URL("https://images.weserv.nl/");
  url.searchParams.set("url", source);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}

export default createCommand(
  {
    name: "enhance",
    description: "Build a real wsrv.nl URL that sharpens and boosts contrast and saturation.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const source = parseHttpUrl(context.args.positional[0]);
      if (!source) {
        return {
          text: "Usage: !enhance <direct image URL> [sharpness] [contrast] [saturation]. Defaults: 2, 10, 1.2.",
        };
      }
      const sharpness = bounded(context.args.positional[1], 2, 0.000001, 10);
      const contrast = bounded(context.args.positional[2], 10, -100, 100);
      const saturation = bounded(context.args.positional[3], 1.2, 0, 10);
      const url = weservUrl(source.toString(), {
        sharp: String(sharpness),
        con: String(contrast),
        sat: String(saturation),
      });
      return {
        text: `✨ Enhance (sharp ${sharpness}, contrast ${contrast}, saturation ${saturation}):\n${url}\n\nProcessed by images.weserv.nl when opened.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!enhance <image URL> [sharpness] [contrast] [saturation]"],
    examples: ["!enhance https://example.org/photo.jpg 3 15 1.3"],
    permission: "public",
    cooldownMs: 2000,
  },
);
