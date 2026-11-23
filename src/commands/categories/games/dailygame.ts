import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

function dailyCode(): string[] {
  const hash = sha256(`${new Date().toISOString().slice(0, 10)}|dailygame`);
  const digits = [...hash]
    .filter((character) => /[0-9a-f]/.test(character))
    .slice(0, 4)
    .map((character, index) =>
      index === 0 ? (parseInt(character, 16) % 9) + 1 : parseInt(character, 16) % 10,
    )
    .map(String);
  return digits;
}

function scoreGuess(
  guess: readonly string[],
  code: readonly string[],
): { bulls: number; cows: number } {
  let bulls = 0;
  const remaining = new Map<string, number>();
  for (let index = 0; index < 4; index += 1) {
    if (guess[index] === code[index]) bulls += 1;
    else remaining.set(code[index]!, (remaining.get(code[index]!) ?? 0) + 1);
  }
  let cows = 0;
  for (let index = 0; index < 4; index += 1) {
    if (guess[index] === code[index]) continue;
    const digit = guess[index]!;
    const count = remaining.get(digit) ?? 0;
    if (count > 0) {
      cows += 1;
      remaining.set(digit, count - 1);
    }
  }
  return { bulls, cows };
}

export default createCommand(
  {
    name: "dailygame",
    description: "Play today's Mastermind-style four-digit code with exact bulls-and-cows scoring.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const code = dailyCode();
      const raw = context.args.positional[0];
      if (raw === undefined) {
        return {
          text: "📅 **Daily Game — Codebreaker**\nCrack today's four-digit code. Usage: `!dailygame 1234`\n🟢 bull = correct digit in the correct place · 🟡 cow = correct digit in the wrong place.\nThe first digit is never zero. The code is identical for everyone on the same UTC day; `!dailygame hint` reveals the digit sum.",
        };
      }
      if (raw.toLowerCase() === "hint") {
        const sum = code.reduce((total, digit) => total + Number(digit), 0);
        return {
          text: `💡 **Daily Game Hint** — today's four digits sum to ${formatInteger(sum)}. The first digit is ${code[0]}…? Keep guessing!`,
        };
      }
      if (!/^[0-9]{4}$/.test(raw))
        return { text: "❌ Guess must be exactly four digits (0–9), e.g. `!dailygame 4821`." };
      const guess = [...raw];
      if (guess[0] === "0")
        return {
          text: "❌ The first digit of the code is never zero. Pick a guess from 1000 to 9999.",
        };
      const { bulls, cows } = scoreGuess(guess, code);
      if (bulls === 4)
        return {
          text: `🎉 **Cracked!** ${formatInteger(Number(raw))} is today's code — all four bulls. Come back tomorrow for a new code!`,
        };
      return {
        text: `📅 **Daily Game** — guess ${formatInteger(Number(raw))}\n\n🟢 Bulls: ${formatInteger(bulls)} · 🟡 Cows: ${formatInteger(cows)}\n${"🟢".repeat(bulls)}${"🟡".repeat(cows)}${"⬛".repeat(4 - bulls - cows)}\n\n${bulls >= 2 ? "Great progress — " : ""}Try \`!dailygame hint\` if you're stuck.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!dailygame <4 digits>", "!dailygame hint", "!dailygame 1234"],
    examples: ["!dailygame", "!dailygame 1234", "!dailygame hint"],
    permission: "public",
    cooldownMs: 1500,
  },
);
