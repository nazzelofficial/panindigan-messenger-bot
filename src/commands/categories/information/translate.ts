import { truncate } from "../../../utils/text.js";
import { fetchJson } from "../../../utils/http.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface TranslationPayload {
  readonly responseData?: { readonly translatedText?: string };
  readonly responseStatus?: number;
  readonly responseDetails?: string;
}

export default createCommand(
  {
    name: "translate",
    description: "Translate text with the no-auth MyMemory API; defaults to English → Tagalog.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const text = truncate(context.args.positional.join(" "), 450);
      if (!text) return { text: "Provide text to translate, for example: !translate Good morning" };
      const from = (context.args.named.from ?? "en").trim();
      const to = (context.args.named.to ?? "tl").trim();
      if (
        !/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/i.test(from) ||
        !/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/i.test(to)
      ) {
        return { text: "Language codes must look like en, tl or pt-BR. Use --from= and --to=." };
      }
      try {
        const url = new URL("https://api.mymemory.translated.net/get");
        url.searchParams.set("q", text);
        url.searchParams.set("langpair", `${from}|${to}`);
        const data = await fetchJson<TranslationPayload>(url.toString());
        if (data.responseStatus !== 200) {
          return {
            text: `Translation service error ${data.responseStatus ?? "unknown"}: ${data.responseDetails || "request rejected"}`,
          };
        }
        const translated = data.responseData?.translatedText;
        if (typeof translated !== "string" || translated.length === 0) {
          return { text: "The translation service returned no translated text." };
        }
        return { text: `[${from} → ${to}]\n${translated}` };
      } catch (error) {
        return {
          text: `Translation failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!translate TEXT [--from=en] [--to=tl]"],
    examples: ["!translate Good morning", "!translate Hola --from=es --to=en"],
    permission: "public",
    cooldownMs: 1500,
  },
);
