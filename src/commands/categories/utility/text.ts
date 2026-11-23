import { titleCase, truncate } from "../../../utils/text.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function argumentText(context: CommandContext): string {
  const raw = context.args.raw.trim();
  const separator = raw.search(/\s/);
  return separator === -1 ? "" : raw.slice(separator).trim();
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 0);
}

export default createCommand(
  {
    name: "text",
    description:
      "Transform text with clean, title, snake, kebab, camel, upper, lower or reverse modes.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const text = argumentText(context);
      if (!text) return { text: "Provide text, for example: !text --mode=title hello world" };
      const mode = (context.args.named.mode ?? "clean").toLowerCase();
      let result: string;
      switch (mode) {
        case "clean":
          result = text.replace(/\s+/g, " ").trim();
          break;
        case "title":
          result = titleCase(text);
          break;
        case "upper":
          result = text.toUpperCase();
          break;
        case "lower":
          result = text.toLowerCase();
          break;
        case "reverse":
          result = Array.from(text).reverse().join("");
          break;
        case "snake":
          result = words(text).join("_");
          break;
        case "kebab":
          result = words(text).join("-");
          break;
        case "camel": {
          const parts = words(text);
          result = parts
            .map((word, index) =>
              index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
            )
            .join("");
          break;
        }
        default:
          return {
            text: "Unknown mode. Use clean, title, upper, lower, reverse, snake, kebab or camel.",
          };
      }
      return { text: `[${mode}]\n${truncate(result, 2000)}` };
    },
  },
  {
    aliases: [],
    usage: ["!text [--mode=clean|title|snake|kebab|camel|upper|lower|reverse] TEXT"],
    examples: [
      "!text hello   world",
      "!text --mode=snake Hello World",
      "!text --mode=camel hello world",
    ],
    permission: "public",
    cooldownMs: 300,
  },
);
