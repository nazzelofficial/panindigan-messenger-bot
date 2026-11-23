import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";
import { formatInteger } from "../../../utils/text.js";

interface CatImage {
  readonly id?: string;
  readonly url?: string;
  readonly width?: number;
  readonly height?: number;
}

export default createCommand(
  {
    name: "cat",
    description: "Fetch a live random cat photograph from The Cat API.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const images = await fetchJson<CatImage[]>("https://api.thecatapi.com/v1/images/search");
        const image = Array.isArray(images) ? images[0] : undefined;
        if (image === undefined || typeof image.url !== "string") {
          return { text: "😕 The cat service returned no usable image. Try again." };
        }
        return {
          text: `🐱 **Random Cat**\n\n${image.url}${image.width !== undefined && image.height !== undefined ? `\nDimensions: ${formatInteger(image.width)}×${formatInteger(image.height)}` : ""}${image.id !== undefined ? `\nImage ID: ${image.id}` : ""}`,
        };
      } catch (error) {
        context.logger.warn({ error }, "cat API request failed");
        return {
          text: "⚠️ The cat service is unavailable right now. Please try again in a moment.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!cat"],
    examples: ["!cat"],
    permission: "public",
    cooldownMs: 2500,
  },
);
