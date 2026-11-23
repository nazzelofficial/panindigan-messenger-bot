import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";

interface ItunesResponse {
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

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))
    return Number(value);
  return 0;
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
    name: "musicinfo",
    description: "Show full metadata for the best matching track in the iTunes catalog.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const term = context.args.positional.join(" ").trim();
      if (term === "") return { text: "Usage: !musicinfo <song or artist and song>." };
      try {
        const tracks = await searchItunes(term);
        const track = tracks[0];
        if (!track) return { text: `iTunes returned no track metadata for "${term}".` };
        const title = asText(track.trackName) || "Unknown title";
        const artist = asText(track.artistName) || "Unknown artist";
        const lines = [
          `🎼 ${title} — ${artist}`,
          `Album: ${asText(track.collectionName) || "not listed"}`,
          `Genre: ${asText(track.primaryGenreName) || "not listed"}`,
          `Released: ${asText(track.releaseDate).slice(0, 10) || "not listed"}`,
          `Store country: ${asText(track.country) || "not listed"}`,
        ];
        const durationMs = asNumber(track.trackTimeMillis);
        if (durationMs > 0) lines.push(`Duration: ${Math.round(durationMs / 1000)} s`);
        const price = asNumber(track.trackPrice);
        if (price > 0) lines.push(`Price: ${asText(track.currency) || "?"} ${price.toFixed(2)}`);
        if (track.trackId !== undefined) lines.push(`iTunes track ID: ${track.trackId}`);
        if (asText(track.previewUrl)) lines.push(`Preview: ${asText(track.previewUrl)}`);
        if (asText(track.trackViewUrl)) lines.push(`Catalog: ${asText(track.trackViewUrl)}`);
        if (asText(track.artworkUrl100)) lines.push(`Artwork: ${asText(track.artworkUrl100)}`);
        return { text: lines.join("\n") };
      } catch (error) {
        return { text: `iTunes lookup failed: ${failure(error)}. No metadata was retrieved.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!musicinfo <song>", "!musicinfo <artist> <song>"],
    examples: ["!musicinfo Smooth Criminal", "!musicinfo Michael Jackson Billie Jean"],
    permission: "public",
    cooldownMs: 3000,
  },
);
