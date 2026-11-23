import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const WORDS: readonly string[] = [
  "planetary",
  "adventure",
  "keyboard",
  "mountain",
  "friendship",
  "telescope",
  "chocolate",
  "lantern",
  "velocity",
  "orchestra",
  "sandwich",
  "journey",
  "bicycle",
  "library",
  "compass",
  "gallery",
  "camera",
  "puzzle",
  "gravity",
  "harbor",
  "harmonic",
  "kingdom",
  "notebook",
  "oceanic",
];

function dailyWord(senderId: string): string {
  const seed = sha256(`${new Date().toISOString().slice(0, 10)}|${senderId}|guessword`);
  return WORDS[parseInt(seed.slice(0, 8), 16) % WORDS.length]!;
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + cost);
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j]!;
  }
  return previous[right.length]!;
}

export default createCommand(
  {
    name: "guessword",
    description:
      "Guess today's secret word and get a real Levenshtein-distance similarity score for each attempt.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const answer = dailyWord(context.senderId);
      const raw = context.args.positional[0];
      if (raw === undefined) {
        return {
          text: `📖 **Guess the Word**\nToday's word has ${formatInteger(answer.length)} letters and starts with **${answer[0]!.toUpperCase()}**.\nUsage: \`!guessword <word>\`\nEach guess is scored by true edit distance — the closer you are, the higher the similarity.`,
        };
      }
      const guess = raw.toLowerCase().replace(/[^a-z]/g, "");
      if (guess.length === 0)
        return { text: "❌ Enter a word made of A–Z letters, e.g. `!guessword lantern`." };
      if (guess === answer)
        return { text: `🎉 **Correct!** The secret word was **${answer}**. You cracked it!` };
      const distance = editDistance(guess, answer);
      const longest = Math.max(guess.length, answer.length);
      const similarity = Math.max(0, Math.round((1 - distance / longest) * 100));
      const shared = [...new Set(guess)].filter((letter) => answer.includes(letter)).length;
      const verdict =
        similarity >= 80 ? "🔥 very close" : similarity >= 50 ? "👍 getting warm" : "❄️ far away";
      return {
        text: `📖 **Guess the Word** — "${raw}" is ${verdict}.\n\nSimilarity: ${formatInteger(similarity)}% · Edit distance: ${formatInteger(distance)}\nLength: guess ${formatInteger(guess.length)} vs answer ${formatInteger(answer.length)} · Shared letters: ${formatInteger(shared)}\nLast letter of the answer: **${answer[answer.length - 1]!.toUpperCase()}**`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!guessword <word>", "!guessword lantern"],
    examples: ["!guessword", "!guessword keyboard", "!guessword mountain"],
    permission: "public",
    cooldownMs: 1500,
  },
);
