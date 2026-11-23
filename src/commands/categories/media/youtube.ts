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
  readonly previewUrl?: string;
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
    name: "youtube",
    description:
      "Search for music and return real catalog links when no YouTube API key is configured.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const term = context.args.positional.join(" ").trim();
      if (term === "") return { text: "Usage: !youtube <song or artist and song>." };
      const notice =
        "No YouTube Data API key is configured for this bot, so no YouTube search was performed and no video URLs were invented. Below are real iTunes catalog results for the same query.";
      try {
        const tracks = await searchItunes(term);
        if (tracks.length === 0)
          return { text: `${notice}\n\niTunes also returned no matches for "${term}".` };
        const lines = tracks.map((track, index) => {
          const title = asText(track.trackName) || "Untitled";
          const artist = asText(track.artistName) || "Unknown artist";
          const link = asText(track.trackViewUrl) || asText(track.previewUrl);
          return `${index + 1}. ${title} — ${artist}${link ? `\n   ${link}` : ""}`;
        });
        return { text: `${notice}\n\n🎬 iTunes matches for "${term}":\n${lines.join("\n")}` };
      } catch (error) {
        return { text: `${notice}\n\niTunes lookup failed: ${failure(error)}.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!youtube <song>", "!youtube <artist> <song>"],
    examples: ["!youtube Gangnam Style", "!youtube Bruno Mars 24K Magic"],
    permission: "public",
    cooldownMs: 3000,
  },
);
