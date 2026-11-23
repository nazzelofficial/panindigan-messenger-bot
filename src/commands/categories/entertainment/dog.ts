import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";

interface DogResponse {
  readonly message?: string;
  readonly status?: string;
}

export default createCommand(
  {
    name: "dog",
    description: "Fetch a live random dog photograph from the public Dog CEO API.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const response = await fetchJson<DogResponse>("https://dog.ceo/api/breeds/image/random");
        if (response.status !== "success" || typeof response.message !== "string") {
          return { text: "😕 The dog service returned an unexpected response. Try again." };
        }
        return { text: `🐶 **Random Dog**\n\n${response.message}` };
      } catch (error) {
        context.logger.warn({ error }, "dog API request failed");
        return {
          text: "⚠️ The dog service is unavailable right now. Please try again in a moment.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!dog"],
    examples: ["!dog"],
    permission: "public",
    cooldownMs: 2500,
  },
);
