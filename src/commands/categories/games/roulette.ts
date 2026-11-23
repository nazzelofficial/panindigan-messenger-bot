import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const RED: ReadonlySet<number> = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

interface Bet {
  readonly label: string;
  readonly multiplier: number;
  readonly wins: (number: number) => boolean;
}

const STRING_BETS: Readonly<Record<string, Bet>> = {
  red: { label: "Red", multiplier: 2, wins: (n) => n !== 0 && RED.has(n) },
  black: { label: "Black", multiplier: 2, wins: (n) => n !== 0 && !RED.has(n) },
  odd: { label: "Odd", multiplier: 2, wins: (n) => n !== 0 && n % 2 === 1 },
  even: { label: "Even", multiplier: 2, wins: (n) => n !== 0 && n % 2 === 0 },
  low: { label: "Low (1–18)", multiplier: 2, wins: (n) => n >= 1 && n <= 18 },
  high: { label: "High (19–36)", multiplier: 2, wins: (n) => n >= 19 && n <= 36 },
  "1-12": { label: "1st dozen", multiplier: 3, wins: (n) => n >= 1 && n <= 12 },
  "2-12": { label: "2nd dozen", multiplier: 3, wins: (n) => n >= 13 && n <= 24 },
  "3-12": { label: "3rd dozen", multiplier: 3, wins: (n) => n >= 25 && n <= 36 },
};

function parseBet(raw: string): Bet | undefined {
  const key = raw.toLowerCase();
  const named = STRING_BETS[key];
  if (named !== undefined) return named;
  const number = Number(raw);
  if (!Number.isInteger(number) || number < 0 || number > 36) return undefined;
  return { label: `Straight ${formatInteger(number)}`, multiplier: 36, wins: (n) => n === number };
}

export default createCommand(
  {
    name: "roulette",
    description: "Bet on a European roulette spin with correct 1:1, 2:1 and 35:1 payout odds.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const [betArg, amountArg] = context.args.positional;
      if (betArg === undefined) {
        return {
          text: "🎡 **Roulette**\nUsage: `!roulette <bet> [amount]`\nBets: `red`, `black`, `odd`, `even`, `low`, `high`, `1-12`, `2-12`, `3-12`, or a number `0`–`36`.\nExample: `!roulette red 500`",
        };
      }
      const bet = parseBet(betArg);
      if (bet === undefined)
        return {
          text: `❌ Unknown bet "${betArg}". Use red, black, odd, even, low, high, 1-12, 2-12, 3-12 or a number 0–36.`,
        };
      let amount = 100;
      if (amountArg !== undefined) {
        const parsed = Number(amountArg);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100_000) {
          return {
            text: "❌ Wager must be a whole number from 1 to 100,000, e.g. `!roulette red 500`.",
          };
        }
        amount = parsed;
      }
      const result = randomInt(0, 36);
      const color = result === 0 ? "🟢 green" : RED.has(result) ? "🔴 red" : "⚫ black";
      const won = bet.wins(result);
      const payout = won ? amount * bet.multiplier : 0;
      const net = payout - amount;
      const outcome = won
        ? `🎉 Win! ${bet.label} pays ${formatInteger(bet.multiplier)}× — payout ${formatInteger(payout)}, profit +${formatInteger(net)}`
        : `😞 Loss — the ball landed on ${formatInteger(result)} ${color}.`;
      return {
        text: `🎡 **Roulette** — ${outcome}\n\nBall: **${formatInteger(result)}** ${color}\nYour bet: ${bet.label} · Stake ${formatInteger(amount)}\nSingle-zero wheel: house edge 2.70%.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!roulette <bet> [amount]", "!roulette 17 200"],
    examples: ["!roulette red 500", "!roulette 17 100", "!roulette 1-12 250"],
    permission: "public",
    cooldownMs: 2500,
  },
);
