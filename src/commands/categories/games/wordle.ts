import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const WORDS: readonly string[] = [
  "APPLE",
  "GRAPE",
  "PLANT",
  "ROBOT",
  "STONE",
  "CLOUD",
  "BRAIN",
  "FLAME",
  "SUGAR",
  "CHAIR",
  "LIGHT",
  "WATER",
  "PEACE",
  "MUSIC",
  "HEART",
  "SPACE",
  "TRACK",
  "BLOOM",
  "CROWN",
  "DREAM",
];

type Mark = "correct" | "present" | "absent";

function dailyWord(senderId: string): string {
  const seed = sha256(`${new Date().toISOString().slice(0, 10)}|${senderId}|wordle`);
  return WORDS[parseInt(seed.slice(0, 8), 16) % WORDS.length]!;
}

function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array.from({ length: 5 }, () => "absent");
  const remaining = new Map<string, number>();
  for (let index = 0; index < 5; index += 1) {
    if (guess[index] === answer[index]) marks[index] = "correct";
    else remaining.set(answer[index]!, (remaining.get(answer[index]!) ?? 0) + 1);
  }
  for (let index = 0; index < 5; index += 1) {
    if (marks[index] === "correct") continue;
    const letter = guess[index]!;
    const count = remaining.get(letter) ?? 0;
    if (count > 0) {
      marks[index] = "present";
      remaining.set(letter, count - 1);
    }
  }
  return marks;
}

function renderGuess(guess: string, marks: readonly Mark[]): string {
  return guess
    .split("")
    .map((letter, index) => {
      const emoji = marks[index] === "correct" ? "🟩" : marks[index] === "present" ? "🟨" : "⬛";
      return `${emoji}${letter}`;
    })
    .join(" ");
}

export default createCommand(
  {
    name: "wordle",
    description:
      "Play a self-contained Wordle round against today's five-letter word with proper duplicate-letter scoring.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const answer = dailyWord(context.senderId);
      const rawGuesses = context.args.positional;
      if (rawGuesses.length === 0) {
        return {
          text: "🟩 **Wordle**\nUsage: `!wordle CRANE SLATE PLANT` — up to six 5-letter guesses in one message.\n🟩 correct position · 🟨 wrong position · ⬛ not in word.\nThe word changes every UTC day and is scored with true duplicate handling.",
        };
      }
      if (rawGuesses.length > 6)
        return { text: "❌ Wordle allows at most six guesses. Send six or fewer words." };
      const rows: string[] = [];
      let solved = false;
      for (const raw of rawGuesses) {
        const guess = raw.toUpperCase();
        if (!/^[A-Z]{5}$/.test(guess))
          return {
            text: `❌ "${raw}" is not a five-letter word. Each guess must be exactly 5 A–Z letters.`,
          };
        const marks = score(guess, answer);
        rows.push(renderGuess(guess, marks));
        if (guess === answer) {
          solved = true;
          break;
        }
      }
      const unique = new Set(rawGuesses.map((guess) => guess.toUpperCase()));
      if (unique.size !== rawGuesses.length)
        return { text: "❌ You repeated a guess. Each Wordle guess must be unique." };
      const used = rawGuesses.length;
      const status = solved
        ? `🎉 Solved in ${formatInteger(used)}/${formatInteger(6)} guesses`
        : used >= 6
          ? `💥 Out of guesses — the word was **${answer}**`
          : `⏸️ ${formatInteger(6 - used)} guesses remaining — add more words`;
      return {
        text: `🟩 **Wordle** — ${status}\n\n${rows.join("\n")}\n\n${Array.from({ length: Math.max(0, 6 - rows.length) }, () => "⬛⬛⬛⬛⬛").join("\n")}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!wordle <guess> [guess...]", "!wordle CRANE SLATE PLANT"],
    examples: ["!wordle", "!wordle STONE CLOUD BRAIN"],
    permission: "public",
    cooldownMs: 2000,
  },
);
