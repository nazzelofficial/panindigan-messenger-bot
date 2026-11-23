import { fetchJson } from "../../../utils/http.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface RandomQuote {
  readonly id?: number;
  readonly quote?: string;
  readonly author?: string;
}

export default createCommand(
  {
    name: "quote",
    description: "Fetch an inspirational quote with its author from DummyJSON's public quote API.",
    category: "information",
    async run(_context: CommandContext): Promise<CommandResult> {
      try {
        const data = await fetchJson<RandomQuote>("https://dummyjson.com/quotes/random");
        if (typeof data.quote !== "string" || data.quote.length === 0) {
          return { text: "The quote service returned no quote. Try again." };
        }
        return {
          text: `“${data.quote}”\n— ${data.author ?? "unknown"}${typeof data.id === "number" ? ` (quote #${data.id})` : ""}`,
        };
      } catch (error) {
        return {
          text: `Quote request failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!quote"],
    examples: ["!quote"],
    permission: "public",
    cooldownMs: 1000,
  },
);
