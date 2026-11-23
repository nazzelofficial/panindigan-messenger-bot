import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";
import { truncate } from "../../../utils/text.js";

interface LyricsResponse {
  readonly lyrics?: string;
}

function parseArtistTitle(
  parts: readonly string[],
): { readonly artist: string; readonly title: string } | undefined {
  if (parts.length === 0) return undefined;
  const parsed =
    parts.length === 1
      ? (() => {
          const pieces = parts[0]!.split(" - ");
          return { artist: (pieces[0] ?? "").trim(), title: pieces.slice(1).join(" - ").trim() };
        })()
      : { artist: (parts[0] ?? "").trim(), title: parts.slice(1).join(" ").trim() };
  return parsed.artist !== "" && parsed.title !== "" ? parsed : undefined;
}

async function fetchLyrics(artist: string, title: string): Promise<string | undefined> {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const data = await fetchJson<LyricsResponse>(url, { timeoutMs: 10_000, maxBytes: 512_000 });
  const lyrics = typeof data.lyrics === "string" ? data.lyrics.trim() : "";
  return lyrics === "" ? undefined : lyrics;
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "lyrics",
    description: "Look up song lyrics from lyrics.ovh for an artist and title.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const parsed = parseArtistTitle(context.args.positional);
      if (!parsed) {
        return {
          text: "Usage: !lyrics <artist> - <title> or !lyrics <artist> <title>. Example: !lyrics Queen - Bohemian Rhapsody",
        };
      }
      try {
        const lyrics = await fetchLyrics(parsed.artist, parsed.title);
        if (!lyrics) {
          return { text: `lyrics.ovh has no lyrics for ${parsed.artist} — ${parsed.title}.` };
        }
        return {
          text: `📝 ${parsed.title} — ${parsed.artist}\nSource: lyrics.ovh\n\n${truncate(lyrics, 3500)}`,
        };
      } catch (error) {
        return { text: `Lyrics lookup failed: ${failure(error)}. No lyrics were retrieved.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!lyrics <artist> - <title>", "!lyrics <artist> <title>"],
    examples: ["!lyrics Queen - Bohemian Rhapsody", "!lyrics Imagine John Lennon"],
    permission: "public",
    cooldownMs: 3000,
  },
);
