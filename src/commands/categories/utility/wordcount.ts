import { truncate } from "../../../utils/text.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function argumentText(context: CommandContext): string {
  const raw = context.args.raw.trim();
  const separator = raw.search(/\s/);
  return separator === -1 ? "" : raw.slice(separator).trim();
}

export default createCommand(
  {
    name: "wordcount",
    description: "Count words, unique words, lines, sentences and characters in supplied text.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const text = argumentText(context);
      if (!text) return { text: "Provide text, for example: !wordcount The quick brown fox" };
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
      const unique = new Set(
        words.map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")),
      );
      const lines = text.split(/\r\n|\r|\n/).length;
      const sentences = text.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
      const characters = Array.from(text).length;
      const average = words.length === 0 ? 0 : characters / words.length;
      return {
        text: [
          `Words: ${words.length}`,
          `Unique words: ${unique.size}`,
          `Lines: ${lines}`,
          `Sentences: ${sentences}`,
          `Characters: ${characters}`,
          `Average characters per word: ${average.toFixed(1)}`,
          `Preview: ${truncate(text.replace(/\s+/g, " "), 200)}`,
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!wordcount TEXT"],
    examples: ["!wordcount The quick brown fox", "!wordcount One line.\nTwo lines."],
    permission: "public",
    cooldownMs: 300,
  },
);
