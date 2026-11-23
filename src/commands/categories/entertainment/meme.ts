import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";
import { formatInteger } from "../../../utils/text.js";

interface MemeResponse {
  readonly postLink?: string;
  readonly subreddit?: string;
  readonly title?: string;
  readonly url?: string;
  readonly nsfw?: boolean;
  readonly author?: string;
  readonly ups?: number;
}

export default createCommand(
  {
    name: "meme",
    description: "Fetch a fresh, live meme image and title from the public meme API.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        let meme: MemeResponse = await fetchJson<MemeResponse>("https://meme-api.com/gimme");
        for (let attempt = 0; attempt < 3 && meme.nsfw === true; attempt += 1) {
          meme = await fetchJson<MemeResponse>("https://meme-api.com/gimme");
        }
        if (meme.nsfw === true || typeof meme.url !== "string") {
          return {
            text: "😕 The meme service only returned unsuitable or incomplete posts. Try again in a moment.",
          };
        }
        return {
          text: `😂 **Meme** — ${meme.title ?? "Untitled"}\n\n${meme.url}\n\nr/${meme.subreddit ?? "memes"} · 👍 ${formatInteger(meme.ups ?? 0)} · by u/${meme.author ?? "unknown"}\n${meme.postLink ?? ""}`.trimEnd(),
        };
      } catch (error) {
        context.logger.warn({ error }, "meme API request failed");
        return {
          text: "⚠️ Could not reach the meme service right now. Please try again in a moment.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!meme"],
    examples: ["!meme"],
    permission: "public",
    cooldownMs: 3000,
  },
);
