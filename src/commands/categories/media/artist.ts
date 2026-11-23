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
    name: "artist",
    description: "Summarize an artist using real iTunes song results.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const term = context.args.positional.join(" ").trim();
      if (term === "")
        return { text: "Usage: !artist <artist name>. Example: !artist Parokya ni Edgar" };
      try {
        const tracks = await searchItunes(term);
        const lowered = term.toLowerCase();
        const matched = tracks.filter((track) =>
          asText(track.artistName).toLowerCase().includes(lowered),
        );
        const relevant = matched.length > 0 ? matched : tracks;
        const artist = asText(relevant[0]?.artistName);
        if (!artist) return { text: `iTunes returned no artist information for "${term}".` };
        const albums = [
          ...new Set(
            relevant.map((track) => asText(track.collectionName)).filter((name) => name !== ""),
          ),
        ];
        const songs = relevant
          .filter((track) => asText(track.trackName) !== "")
          .map(
            (track, index) =>
              `${index + 1}. ${asText(track.trackName)}${asText(track.collectionName) ? ` (${asText(track.collectionName)})` : ""}`,
          );
        const lines = [
          `🎤 ${artist}`,
          `Matching songs in this iTunes result set: ${relevant.length}`,
          `Albums represented: ${albums.length > 0 ? albums.join(", ") : "not listed"}`,
          songs.length > 0
            ? `Top results:\n${songs.join("\n")}`
            : "No individual tracks were returned.",
        ];
        if (asText(relevant[0]?.artworkUrl100))
          lines.push(`Artwork: ${asText(relevant[0]!.artworkUrl100!)}`);
        return { text: lines.join("\n\n") };
      } catch (error) {
        return {
          text: `iTunes lookup failed: ${failure(error)}. No artist information was retrieved.`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!artist <artist name>"],
    examples: ["!artist Parokya ni Edgar", "!artist The Beatles"],
    permission: "public",
    cooldownMs: 3000,
  },
);
