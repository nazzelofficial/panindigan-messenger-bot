import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";

interface ItunesResponse {
  readonly resultCount?: number;
  readonly results?: readonly unknown[];
}

interface ItunesTrack {
  readonly trackId?: number;
  readonly trackName?: string;
  readonly artistName?: string;
  readonly collectionName?: string;
  readonly artworkUrl100?: string;
  readonly previewUrl?: string;
  readonly trackViewUrl?: string;
  readonly collectionViewUrl?: string;
  readonly primaryGenreName?: string;
  readonly releaseDate?: string;
  readonly trackTimeMillis?: number;
  readonly country?: string;
  readonly currency?: string;
  readonly trackPrice?: number;
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

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "play",
    description: "Find a real 30-second iTunes preview and catalog link for a song.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const term = context.args.positional.join(" ").trim();
      if (term === "") {
        return {
          text: "Usage: !play <song> or !play <artist> <song>. Example: !play Bohemian Rhapsody Queen",
        };
      }
      try {
        const tracks = await searchItunes(term);
        const track = tracks.find(
          (item) => typeof item.previewUrl === "string" && item.previewUrl.length > 0,
        );
        if (!track) {
          return {
            text: `iTunes has no playable preview for "${term}". Try a different spelling or include the artist.`,
          };
        }
        const previewUrl = track.previewUrl!;
        const title = asText(track.trackName) || "Unknown title";
        const artist = asText(track.artistName) || "Unknown artist";
        const album = asText(track.collectionName) || "Unknown album";
        const link = asText(track.trackViewUrl) || previewUrl;
        return {
          text: `🎵 ${title} — ${artist}\nAlbum: ${album}\nPreview (30s): ${previewUrl}\nCatalog: ${link}\n\nThe bot does not stream audio into the thread; open the preview link to listen.`,
        };
      } catch (error) {
        return { text: `iTunes lookup failed: ${failure(error)}. No preview was retrieved.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!play <song>", "!play <artist> <song>"],
    examples: ["!play Bohemian Rhapsody", "!play Imagine John Lennon"],
    permission: "public",
    cooldownMs: 3000,
  },
);
