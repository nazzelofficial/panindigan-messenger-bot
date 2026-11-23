import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256, shuffle } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const WORDS: readonly string[] = [
  "TELescope|science",
  "GUITAR|music",
  "SANDWICH|food",
  "BICYCLE|object",
  "MOUNTAIN|nature",
  "KEYBOARD|technology",
  "PAINTING|art",
  "OCEAN|nature",
  "FRIENDSHIP|concept",
  "LIGHTNING|weather",
  "CINNAMON|food",
  "COMPASS|tool",
  "VOLCANO|nature",
  "HARMONY|music",
  "TELESCOPE|science",
  "CHOCOLATE|food",
  "GALLERY|place",
  "JOURNEY|concept",
  "LANTERN|object",
  "VELOCITY|science",
  "ORCHESTRA|music",
  "ADVENTURE|concept",
  "GRAPES|food",
  "PLANET|space",
  "WINDOW|object",
];

function todayEntry(senderId: string): { word: string; category: string } {
  const seed = sha256(`${new Date().toISOString().slice(0, 10)}|${senderId}|scramble`);
  const entry = WORDS[parseInt(seed.slice(0, 8), 16) % WORDS.length]!;
  const [word, category] = entry.toUpperCase().split("|");
  return { word: word!, category: category! };
}

function scrambleWord(word: string): string {
  if (word.length <= 2) return word;
  const middle = shuffle([...word.slice(1, -1)]);
  return `${word[0]}${middle.join("")}${word[word.length - 1]}`;
}

function signature(value: string): string {
  return [...value].sort().join("");
}

export default createCommand(
  {
    name: "scramble",
    description:
      "Unscramble a daily jumbled word; guesses are validated against the exact letter multiset.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const { word, category } = todayEntry(context.senderId);
      let scrambled = scrambleWord(word);
      let guard = 0;
      while (scrambled === word && guard < 10) {
        scrambled = scrambleWord(word);
        guard += 1;
      }
      const raw = context.args.positional[0];
      if (raw === undefined) {
        return {
          text: `🔤 **Scramble**\nUnscramble this ${formatInteger(word.length)}-letter word (${category}):\n\n**${scrambled}**\n\nUsage: \`!scramble <your word>\` — your answer must use every letter exactly once.`,
        };
      }
      const guess = raw.toUpperCase().replace(/[^A-Z]/g, "");
      if (guess.length === 0)
        return { text: "❌ Enter a word made of letters, e.g. `!scramble KEYBOARD`." };
      if (guess.length !== word.length)
        return {
          text: `❌ Your guess has ${formatInteger(guess.length)} letters; the answer has ${formatInteger(word.length)}.`,
        };
      if (signature(guess) !== signature(word))
        return {
          text: `❌ "${raw}" does not use the same letters as **${scrambled}**. All ${formatInteger(word.length)} letters must match exactly once.`,
        };
      if (guess === word)
        return {
          text: `🎉 **Unscrambled!** **${scrambled}** → **${word}** (${category}). Nicely done!`,
        };
      const positions = [...word].filter((letter, index) => letter === guess[index]).length;
      return {
        text: `🔤 **Scramble** — "${raw}" uses the right letters but is not the word yet.\n\nScramble: **${scrambled}** · Letters in the correct position: ${formatInteger(positions)}/${formatInteger(word.length)}\nHint: it starts with **${word[0]}** and ends with **${word[word.length - 1]}**.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!scramble [guess]", "!scramble KEYBOARD"],
    examples: ["!scramble", "!scramble TELESCOPE"],
    permission: "public",
    cooldownMs: 1500,
  },
);
