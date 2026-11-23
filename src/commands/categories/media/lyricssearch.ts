import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";
import { truncate } from "../../../utils/text.js";

interface ItunesResponse {
  readonly results?: readonly unknown[];
}
interface ItunesTrack {
  readonly trackName?: string;
  readonly artistName?: string;
  readonly collectionName?: string;
  readonly trackViewUrl?: string;
}
interface LyricsResponse {
  readonly lyrics?: string;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function searchItunes(term: string): Promise<ItunesTrack[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5`;
  const data = await fetchJson<ItunesResponse>(url, { timeoutMs: 10_000, maxBytes: 512_000 });
  const results: readonly unknown[] = Array.isArray(data.results)
    ? (data.results as readonly unknown[])
    : [];
  return results.filter((item): item is ItunesTrack => typeof item === "object" && item !== null);
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
    name: "lyricssearch",
    description: "Find a song through iTunes and try to retrieve its real lyrics from lyrics.ovh.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const term = context.args.positional.join(" ").trim();
      if (term === "") {
        return {
          text: "Usage: !lyricssearch <song or artist and song>. Example: !lyricssearch Wonderwall Oasis",
        };
      }
      let candidates: ItunesTrack[];
      try {
        candidates = await searchItunes(term);
      } catch (error) {
        return { text: `iTunes search failed: ${failure(error)}. No lyrics were retrieved.` };
      }
      if (candidates.length === 0) return { text: `iTunes returned no matches for "${term}".` };
      const attempts = candidates.slice(0, 3);
      const errors: string[] = [];
      for (const candidate of attempts) {
        const artist = asText(candidate.artistName);
        const title = asText(candidate.trackName);
        if (artist === "" || title === "") continue;
        try {
          const lyrics = await fetchLyrics(artist, title);
          if (lyrics) {
            const link = asText(candidate.trackViewUrl);
            return {
              text: `📝 ${title} — ${artist}\nSource: lyrics.ovh (matched via iTunes)${link ? `\nCatalog: ${link}` : ""}\n\n${truncate(lyrics, 3500)}`,
            };
          }
          errors.push("no lyrics returned");
        } catch (error) {
          errors.push(failure(error));
        }
      }
      return {
        text: `No lyrics were found for "${term}" in the first ${attempts.length} iTunes matches (${errors.join("; ") || "no candidates with artist and title"}). Try !lyrics <artist> - <title> with an exact title.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!lyricssearch <song>", "!lyricssearch <artist> <song>"],
    examples: ["!lyricssearch Wonderwall Oasis", "!lyricssearch Hallelujah Leonard Cohen"],
    permission: "public",
    cooldownMs: 4000,
  },
);
