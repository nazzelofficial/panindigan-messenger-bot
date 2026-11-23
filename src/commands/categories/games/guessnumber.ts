import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

function dailyTarget(senderId: string): number {
  const seed = sha256(`${new Date().toISOString().slice(0, 10)}|${senderId}|guessnumber`);
  return (parseInt(seed.slice(0, 8), 16) % 100) + 1;
}

export default createCommand(
  {
    name: "guessnumber",
    description: "Guess today's secret number between 1 and 100 with higher-or-lower feedback.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = dailyTarget(context.senderId);
      const raw = context.args.positional[0];
      if (raw === undefined) {
        return {
          text: "🔢 **Guess the Number**\nUsage: `!guessnumber <1-100>`\nA new secret number is generated for you each UTC day. Try `!guessnumber 50` to start.",
        };
      }
      const guess = Number(raw);
      if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
        return { text: "❌ Guess must be a whole number between 1 and 100." };
      }
      if (guess === target) {
        return {
          text: `🎯 **Correct!** ${formatInteger(guess)} is today's secret number. Well guessed!`,
        };
      }
      const distance = Math.abs(target - guess);
      const heat =
        distance <= 3
          ? "🔥 boiling"
          : distance <= 10
            ? "warm"
            : distance <= 25
              ? "cool"
              : "❄️ cold";
      return {
        text: `🔢 **Guess the Number** — ${formatInteger(guess)} is too ${guess < target ? "low" : "high"}. (${heat})\nHint: the secret is ${guess < target ? "above" : "below"} ${formatInteger(guess)}. Try again!`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!guessnumber <1-100>", "!guessnumber 50"],
    examples: ["!guessnumber", "!guessnumber 42", "!guessnumber 73"],
    permission: "public",
    cooldownMs: 1000,
  },
);
