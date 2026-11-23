import { fetchJson } from "../../../utils/http.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface UselessFact {
  readonly id?: string;
  readonly text?: string;
  readonly source_url?: string;
  readonly permalink?: string;
}

export default createCommand(
  {
    name: "facts",
    description: "Fetch a random verified useless fact from the public Useless Facts API (v2).",
    category: "information",
    async run(_context: CommandContext): Promise<CommandResult> {
      try {
        const data = await fetchJson<UselessFact>(
          "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en",
        );
        if (typeof data.text !== "string" || data.text.length === 0) {
          return { text: "The facts service returned an empty entry. Try again." };
        }
        return {
          text: `Random fact:\n${data.text}${data.permalink ? `\n\nSource: ${data.permalink}` : ""}`,
        };
      } catch (error) {
        return {
          text: `Fact request failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!facts"],
    examples: ["!facts"],
    permission: "public",
    cooldownMs: 1000,
  },
);
