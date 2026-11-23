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

async function searchItunes(term: string, limit: number): Promise<ItunesTrack[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
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
    name: "searchmusic",
    description: "Search the iTunes music catalog and list matching songs with links.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const term = context.args.positional.join(" ").trim();
      if (term === "")
        return { text: "Usage: !searchmusic <query> [--limit=5]. Limit is capped at 5." };
      const requested = Number(context.args.named["limit"] ?? "5");
      const limit = Number.isInteger(requested) && requested >= 1 && requested <= 5 ? requested : 5;
      try {
        const tracks = await searchItunes(term, limit);
        if (tracks.length === 0) return { text: `iTunes returned no songs for "${term}".` };
        const lines = tracks.map((track, index) => {
          const title = asText(track.trackName) || "Untitled";
          const artist = asText(track.artistName) || "Unknown artist";
          const album = asText(track.collectionName);
          const link = asText(track.trackViewUrl) || asText(track.previewUrl);
          return `${index + 1}. ${title} — ${artist}${album ? ` [${album}]` : ""}${link ? `\n   ${link}` : ""}`;
        });
        return { text: `🔎 iTunes results for "${term}":\n${lines.join("\n")}` };
      } catch (error) {
        return { text: `iTunes search failed: ${failure(error)}. No results were retrieved.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!searchmusic <query>", "!searchmusic <query> --limit=5"],
    examples: ["!searchmusic Oasis", "!searchmusic Oasis --limit=3"],
    permission: "public",
    cooldownMs: 3000,
  },
);
