import { fetchJson } from "../../../utils/http.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface CatFact {
  readonly fact?: string;
  readonly length?: number;
}

export default createCommand(
  {
    name: "randomfact",
    description: "Fetch a random zoological fact about cats from the Cat Fact API.",
    category: "information",
    async run(_context: CommandContext): Promise<CommandResult> {
      try {
        const data = await fetchJson<CatFact>("https://catfact.ninja/fact");
        if (typeof data.fact !== "string" || data.fact.length === 0) {
          return { text: "The fact service returned an empty response. Try again." };
        }
        return { text: `Did you know?\n${data.fact}` };
      } catch (error) {
        return {
          text: `Fact request failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!randomfact"],
    examples: ["!randomfact"],
    permission: "public",
    cooldownMs: 1000,
  },
);
