import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";

interface ItunesResponse {
  readonly results?: readonly unknown[];
}
interface ItunesTrack {
  readonly trackName?: string;
  readonly artistName?: string;
  readonly collectionName?: string;
  readonly trackViewUrl?: string;
  readonly collectionViewUrl?: string;
  readonly artworkUrl100?: string;
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
    name: "album",
    description: "Show the tracks of an album from real iTunes song results.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const term = context.args.positional.join(" ").trim();
      if (term === "") return { text: "Usage: !album <album name> or !album <artist> <album>." };
      try {
        const tracks = await searchItunes(term);
        const lowered = term.toLowerCase();
        const matching = tracks.filter((track) =>
          asText(track.collectionName).toLowerCase().includes(lowered),
        );
        const albumTrack = matching[0] ?? tracks[0];
        if (!albumTrack || asText(albumTrack.collectionName) === "") {
          return { text: `iTunes returned no album information for "${term}".` };
        }
        const album = asText(albumTrack.collectionName);
        const artist = asText(albumTrack.artistName) || "Unknown artist";
        const sameAlbum = tracks.filter((track) => asText(track.collectionName) === album);
        const songs = sameAlbum
          .map((track, index) => `${index + 1}. ${asText(track.trackName) || "Untitled track"}`)
          .join("\n");
        const lines = [
          `💿 ${album} — ${artist}`,
          `Tracks found in this result set (${sameAlbum.length}):\n${songs || "none"}`,
        ];
        if (asText(albumTrack.collectionViewUrl))
          lines.push(`Catalog: ${asText(albumTrack.collectionViewUrl)}`);
        else if (asText(albumTrack.trackViewUrl))
          lines.push(`Track: ${asText(albumTrack.trackViewUrl)}`);
        if (asText(albumTrack.artworkUrl100))
          lines.push(`Artwork: ${asText(albumTrack.artworkUrl100)}`);
        return { text: lines.join("\n\n") };
      } catch (error) {
        return {
          text: `iTunes lookup failed: ${failure(error)}. No album information was retrieved.`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!album <album>", "!album <artist> <album>"],
    examples: ["!album Abbey Road", "!album Taylor Swift 1989"],
    permission: "public",
    cooldownMs: 3000,
  },
);
