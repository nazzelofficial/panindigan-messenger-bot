import { fetchText } from "../../../utils/http.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "shorten",
    description: "Shorten an http(s) URL through TinyURL's public, no-authentication API.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const input = context.args.positional[0];
      if (!input)
        return { text: "Provide a URL to shorten, for example: !shorten https://example.com" };
      let target: URL;
      try {
        target = new URL(input);
      } catch {
        try {
          target = new URL(`https://${input}`);
        } catch {
          return { text: `"${input}" is not a valid URL.` };
        }
      }
      if (target.protocol !== "http:" && target.protocol !== "https:") {
        return { text: "Only http and https URLs can be shortened." };
      }
      try {
        const url = new URL("https://tinyurl.com/api-create.php");
        url.searchParams.set("url", target.toString());
        const shortened = (await fetchText(url.toString())).trim();
        if (!/^https?:\/\/\S+$/i.test(shortened)) {
          return {
            text: "TinyURL returned an unexpected response; no short link could be confirmed.",
          };
        }
        return { text: `Short URL: ${shortened}\nOriginal: ${target.toString()}` };
      } catch (error) {
        return {
          text: `Shortening failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!shorten URL"],
    examples: ["!shorten https://example.com", "!shorten example.com/docs"],
    permission: "public",
    cooldownMs: 2000,
  },
);
