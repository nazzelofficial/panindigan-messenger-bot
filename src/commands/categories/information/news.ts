import { fetchJson } from "../../../utils/http.js";
import { formatDateTime } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface HackerNewsItem {
  readonly id?: number;
  readonly title?: string;
  readonly url?: string;
  readonly score?: number;
  readonly by?: string;
  readonly time?: number;
}

export default createCommand(
  {
    name: "news",
    description: "Fetch the current top technology stories from Hacker News (no API key required).",
    category: "information",
    async run(_context: CommandContext): Promise<CommandResult> {
      try {
        const idsPayload: unknown = await fetchJson<unknown>(
          "https://hacker-news.firebaseio.com/v0/topstories.json",
        );
        const idList: readonly unknown[] = Array.isArray(idsPayload)
          ? (idsPayload as readonly unknown[])
          : [];
        const ids = idList
          .filter((value): value is number => typeof value === "number")
          .slice(0, 5);
        if (ids.length === 0) return { text: "The news index returned no story IDs." };
        const items = await Promise.all(
          ids.map(async (id): Promise<HackerNewsItem | undefined> => {
            try {
              return await fetchJson<HackerNewsItem>(
                `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
              );
            } catch {
              return undefined;
            }
          }),
        );
        const stories = items.filter(
          (item): item is HackerNewsItem => item !== undefined && typeof item.title === "string",
        );
        if (stories.length === 0)
          return { text: "No story details could be retrieved from Hacker News." };
        const lines = stories.map((story, index) => {
          const link = story.url ?? `https://news.ycombinator.com/item?id=${story.id ?? ""}`;
          const score = typeof story.score === "number" ? ` · ${story.score} pts` : "";
          const author = story.by ? ` by ${story.by}` : "";
          const posted =
            typeof story.time === "number" ? ` · ${formatDateTime(story.time * 1000)}` : "";
          return `${index + 1}. ${story.title}\n   ${link}${score}${author}${posted}`;
        });
        return { text: `Hacker News top stories:\n${lines.join("\n")}` };
      } catch (error) {
        return {
          text: `News request failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!news"],
    examples: ["!news"],
    permission: "public",
    cooldownMs: 5000,
  },
);
