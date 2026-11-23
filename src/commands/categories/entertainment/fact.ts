import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";

interface UselessFact {
  readonly text?: string;
  readonly source?: string;
  readonly url?: string;
}

export default createCommand(
  {
    name: "fact",
    description: "Fetch a random verified-but-useless fact from the public Useless Facts API.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const fact = await fetchJson<UselessFact>(
          "https://uselessfacts.jsph.pl/random.json?language=en",
        );
        if (typeof fact.text !== "string" || fact.text.length === 0) {
          return { text: "😕 The fact service returned an incomplete entry. Try again." };
        }
        return {
          text: `🧠 **Random Fact**\n\n${fact.text}${fact.source ? `\n\nSource: ${fact.source}` : ""}${fact.url ? `\nMore: ${fact.url}` : ""}`,
        };
      } catch (error) {
        context.logger.warn({ error }, "useless facts API request failed");
        return {
          text: "⚠️ The fact service is unavailable right now. Please try again in a moment.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!fact"],
    examples: ["!fact"],
    permission: "public",
    cooldownMs: 2000,
  },
);
