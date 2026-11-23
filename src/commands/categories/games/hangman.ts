import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const WORDS: readonly string[] = [
  "GIRAFFE|animal",
  "MOUNTAIN|nature",
  "VIOLIN|music",
  "GALAXY|space",
  "PYTHON|language",
  "ORCHARD|nature",
  "CAPTAIN|rank",
  "LIGHTNING|weather",
  "BANANA|fruit",
  "PIANO|instrument",
  "ELEPHANT|animal",
  "COFFEE|drink",
  "BOOKSHELF|object",
  "FRIENDSHIP|concept",
  "OCEAN|nature",
  "CAMERA|object",
  "BICYCLE|object",
  "JUNGLE|nature",
  "CHOCOLATE|food",
  "TELESCOPE|science",
  "UMBRELLA|weather",
  "KEYBOARD|technology",
  "CANVAS|art",
  "HARMONY|music",
  "VOLCANO|nature",
];

function dailyWord(senderId: string): { word: string; category: string } {
  const seed = sha256(`${new Date().toISOString().slice(0, 10)}|${senderId}|hangman`);
  const index = parseInt(seed.slice(0, 8), 16) % WORDS.length;
  const entry = WORDS[index]!;
  const [word, category] = entry.split("|");
  return { word: word!, category: category! };
}

function masked(word: string, guesses: readonly string[]): string {
  return [...word].map((letter) => (guesses.includes(letter) ? letter : "_")).join(" ");
}

export default createCommand(
  {
    name: "hangman",
    description:
      "Guess today's hidden word one letter at a time with six lives before the gallows fills.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const { word, category } = dailyWord(context.senderId);
      const guesses: string[] = [];
      for (const raw of context.args.positional) {
        const letter = raw.toUpperCase();
        if (letter.length !== 1 || !/^[A-Z]$/.test(letter)) {
          return { text: `❌ "${raw}" is not a single letter. Usage: \`!hangman a e i o u\`.` };
        }
        if (!guesses.includes(letter)) guesses.push(letter);
      }
      const wrong = guesses.filter((letter) => !word.includes(letter));
      const lives = Math.max(0, 6 - wrong.length);
      const correct = guesses.filter((letter) => word.includes(letter));
      const solved = [...word].every((letter) => guesses.includes(letter));
      const lost = !solved && lives === 0;
      const stages = ["🦵", "🦵🦶", "🦵🦶🦵", "🦵🦶🦵🦶", "🦻", "😵"];
      const status = solved
        ? "🎉 You saved the hangman!"
        : lost
          ? `💀 Executed — the word was **${word}**.`
          : lives === 6
            ? "🎬 New round started."
            : "⏸️ Still alive — keep guessing.";
      const lines = [
        `🎯 **Hangman** — ${status}`,
        "",
        `${masked(word, guesses)}`,
        "",
        `Category: ${category} · Length: ${formatInteger(word.length)}`,
        `Lives left: ${formatInteger(lives)}/6 · Wrong: ${wrong.length > 0 ? wrong.join(", ") : "none"}`,
        `Correct letters: ${correct.length > 0 ? correct.join(", ") : "none"}`,
      ];
      if (!solved && !lost)
        lines.push(
          "",
          `Gallows: ${stages[Math.min(5, wrong.length)]}`,
          "Usage: `!hangman a e i o` — the puzzle resets each UTC day.",
        );
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!hangman [letters...]", "!hangman a e i o u"],
    examples: ["!hangman", "!hangman a e i", "!hangman r s t l n"],
    permission: "public",
    cooldownMs: 1500,
  },
);
