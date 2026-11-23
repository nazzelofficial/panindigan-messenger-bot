import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";
import { randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface PicsumPhoto {
  readonly id?: string;
  readonly author?: string;
  readonly width?: number;
  readonly height?: number;
  readonly url?: string;
  readonly download_url?: string;
}

export default createCommand(
  {
    name: "image",
    description:
      "Fetch a live random photograph with photographer attribution from the Picsum photo API.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      let page = randomInt(1, 50);
      if (raw !== undefined) {
        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
          return { text: "❌ Page must be a whole number from 1 to 1000, e.g. `!image 5`." };
        }
        page = parsed;
      }
      try {
        const photos = await fetchJson<PicsumPhoto[]>(
          `https://picsum.photos/v2/list?page=${page}&limit=10`,
        );
        const photo = Array.isArray(photos)
          ? photos[randomInt(0, Math.max(0, photos.length - 1))]
          : undefined;
        if (photo === undefined || typeof photo.download_url !== "string") {
          return {
            text: "😕 No photographs were available on that page. Try another page number.",
          };
        }
        return {
          text: `🖼️ **Random Photo**\n\n${photo.download_url}\n\nBy ${photo.author ?? "unknown"}${photo.width !== undefined && photo.height !== undefined ? ` · ${formatInteger(photo.width)}×${formatInteger(photo.height)}` : ""}\nOriginal: ${photo.url ?? "unavailable"}`,
        };
      } catch (error) {
        context.logger.warn({ error }, "image API request failed");
        return {
          text: "⚠️ The photo service is unavailable right now. Please try again in a moment.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!image [page]", "!image 5"],
    examples: ["!image", "!image 12"],
    permission: "public",
    cooldownMs: 2500,
  },
);
