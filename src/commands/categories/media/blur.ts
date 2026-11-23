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

function sigma(value: string | undefined): number {
  if (!value) return 5;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0.3 && parsed <= 1000 ? parsed : 5;
}

function weservUrl(source: string, parameters: Readonly<Record<string, string>>): string {
  const url = new URL("https://images.weserv.nl/");
  url.searchParams.set("url", source);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}

export default createCommand(
  {
    name: "blur",
    description: "Build a real wsrv.nl Gaussian-blur URL for a direct image URL.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const source = parseHttpUrl(context.args.positional[0]);
      if (!source)
        return {
          text: "Usage: !blur <direct image URL> [sigma]. Sigma must be between 0.3 and 1000 (default 5).",
        };
      const amount = sigma(context.args.positional[1]);
      const url = weservUrl(source.toString(), { blur: String(amount) });
      return {
        text: `🌫️ Gaussian blur with sigma ${amount}:\n${url}\n\nProcessed by images.weserv.nl when opened.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!blur <image URL> [sigma]"],
    examples: ["!blur https://example.org/photo.jpg 8"],
    permission: "public",
    cooldownMs: 2000,
  },
);
