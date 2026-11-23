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
  readonly primaryGenreName?: string;
  readonly releaseDate?: string;
  readonly trackTimeMillis?: number;
  readonly country?: string;
  readonly currency?: string;
  readonly trackPrice?: number;
  readonly previewUrl?: string;
  readonly trackViewUrl?: string;
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
    name: "track",
    description: "Identify one specific track and show its real iTunes metadata.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const term = context.args.positional.join(" ").trim();
      if (term === "") return { text: "Usage: !track <track or artist and track>." };
      try {
        const tracks = await searchItunes(term);
        const track = tracks[0];
        if (!track) return { text: `iTunes returned no track for "${term}".` };
        const lines = [
          `🎧 ${asText(track.trackName) || "Untitled"} — ${asText(track.artistName) || "Unknown artist"}`,
          `Album: ${asText(track.collectionName) || "not listed"}`,
          `Genre: ${asText(track.primaryGenreName) || "not listed"}`,
          `Released: ${asText(track.releaseDate).slice(0, 10) || "not listed"}`,
        ];
        if (track.trackId !== undefined) lines.push(`Track ID: ${track.trackId}`);
        const duration = asNumber(track.trackTimeMillis);
        if (duration > 0)
          lines.push(
            `Length: ${Math.floor(duration / 60_000)}:${String(Math.round((duration % 60_000) / 1000)).padStart(2, "0")}`,
          );
        if (asText(track.previewUrl)) lines.push(`Preview: ${asText(track.previewUrl)}`);
        if (asText(track.trackViewUrl)) lines.push(`Details: ${asText(track.trackViewUrl)}`);
        return { text: lines.join("\n") };
      } catch (error) {
        return { text: `iTunes lookup failed: ${failure(error)}. No track was identified.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!track <track>", "!track <artist> <track>"],
    examples: ["!track Billie Jean", "!track Queen Another One Bites The Dust"],
    permission: "public",
    cooldownMs: 3000,
  },
);
