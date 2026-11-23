import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface Symbol {
  readonly icon: string;
  readonly name: string;
  readonly weight: number;
  readonly tripleMultiplier: number;
}

const SYMBOLS: readonly Symbol[] = [
  { icon: "🍒", name: "cherry", weight: 30, tripleMultiplier: 3 },
  { icon: "🍋", name: "lemon", weight: 25, tripleMultiplier: 5 },
  { icon: "🔔", name: "bell", weight: 18, tripleMultiplier: 8 },
  { icon: "⭐", name: "star", weight: 12, tripleMultiplier: 12 },
  { icon: "7️⃣", name: "seven", weight: 9, tripleMultiplier: 20 },
  { icon: "💎", name: "diamond", weight: 6, tripleMultiplier: 50 },
];
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);

function spin(): Symbol {
  let roll = randomInt(1, TOTAL_WEIGHT);
  for (const symbol of SYMBOLS) {
    if (roll <= symbol.weight) return symbol;
    roll -= symbol.weight;
  }
  return SYMBOLS[0]!;
}

export default createCommand(
  {
    name: "slots",
    description: "Spin three weighted reels and compute real payouts for triples and pairs.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0];
      let bet = 100;
      if (requested !== undefined) {
        const parsed = Number(requested);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) {
          return { text: "❌ Bet must be a whole number from 1 to 10,000, e.g. `!slots 250`." };
        }
        bet = parsed;
      }
      const reels = [spin(), spin(), spin()];
      const [first, second, third] = reels;
      const allSame = first!.name === second!.name && second!.name === third!.name;
      const pairCount =
        first!.name === second!.name || second!.name === third!.name || first!.name === third!.name;
      let payout = 0;
      let detail = "No match — the house keeps the bet.";
      if (allSame) {
        payout = bet * first!.tripleMultiplier;
        detail = `Triple ${first!.name} pays ${formatInteger(first!.tripleMultiplier)}×!`;
      } else if (pairCount) {
        payout = bet;
        detail = "A matching pair pushes your bet.";
      }
      const net = payout - bet;
      const outcome =
        net > 0
          ? `🎉 Profit +${formatInteger(net)}`
          : net === 0
            ? "🤝 Break even"
            : `😞 Loss ${formatInteger(Math.abs(net))}`;
      return {
        text: `🎰 **Slots** — ${outcome}\n\n\u2501\u2501\u2501\n${first!.icon} │ ${second!.icon} │ ${third!.icon}\n\u2501\u2501\u2501\n\nBet: ${formatInteger(bet)} · Payout: ${formatInteger(payout)}\n${detail}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!slots [bet]", "!slots 250"],
    examples: ["!slots", "!slots 100", "!slots 1000"],
    permission: "public",
    cooldownMs: 2500,
  },
);
