import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { shuffle } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface Card {
  readonly rank: string;
  readonly suit: string;
}

const RANKS: readonly string[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS: readonly string[] = ["♠", "♥", "♦", "♣"];

function deck(): Card[] {
  return shuffle(SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit }))));
}

function label(card: Card): string {
  return `${card.rank}${card.suit}`;
}

function total(cards: readonly Card[]): { value: number; soft: boolean } {
  let sum = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      sum += 11;
      aces += 1;
    } else if (card.rank === "K" || card.rank === "Q" || card.rank === "J") sum += 10;
    else sum += Number(card.rank);
  }
  let soft = aces > 0;
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces -= 1;
    soft = aces > 0;
  }
  return { value: sum, soft };
}

export default createCommand(
  {
    name: "blackjack",
    description:
      "Play blackjack against a dealer using a freshly shuffled 52-card deck with correct ace totals.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const rawActions = context.args.positional.map((action) => action.toLowerCase());
      if (rawActions.some((action) => !["hit", "h", "stand", "s"].includes(action))) {
        return {
          text: "❌ Use only `hit`/`h` and `stand`/`s`, e.g. `!blackjack hit hit stand`. With no arguments you stand automatically.",
        };
      }
      if (rawActions.includes("hit") && rawActions.includes("stand")) {
        const hitIndex = rawActions.indexOf("hit");
        const standIndex = rawActions.indexOf("stand");
        if (hitIndex > standIndex)
          return {
            text: "❌ List your actions in order — once you stand the turn ends. e.g. `!blackjack hit stand`.",
          };
      }
      const pile = deck();
      const player: Card[] = [pile.pop()!, pile.pop()!];
      const dealer: Card[] = [pile.pop()!, pile.pop()!];
      const actions: string[] = rawActions.length === 0 ? ["stand"] : rawActions;
      let busted = false;
      const drawn: string[] = [];
      for (const action of actions) {
        if (action === "stand" || action === "s") break;
        const card = pile.pop()!;
        player.push(card);
        drawn.push(label(card));
        if (total(player).value > 21) {
          busted = true;
          break;
        }
      }
      let dealerHand = [...dealer];
      if (!busted) {
        while (total(dealerHand).value < 17) dealerHand = [...dealerHand, pile.pop()!];
      }
      const playerTotal = total(player);
      const dealerTotal = total(dealerHand);
      let outcome: string;
      if (busted) outcome = `💥 You busted with ${formatInteger(playerTotal.value)} — dealer wins.`;
      else if (playerTotal.value === 21 && player.length === 2)
        outcome = "🃏 Blackjack! You win 3:2.";
      else if (dealerTotal.value > 21)
        outcome = `🎉 Dealer busted with ${formatInteger(dealerTotal.value)} — you win!`;
      else if (playerTotal.value > dealerTotal.value)
        outcome = `🎉 You win ${formatInteger(playerTotal.value)} to ${formatInteger(dealerTotal.value)}.`;
      else if (playerTotal.value === dealerTotal.value)
        outcome = `🤝 Push at ${formatInteger(playerTotal.value)}.`;
      else
        outcome = `😞 Dealer wins ${formatInteger(dealerTotal.value)} to ${formatInteger(playerTotal.value)}.`;
      return {
        text: `🃏 **Blackjack** — ${outcome}\n\nYour hand: ${player.map(label).join(" ")} → ${formatInteger(playerTotal.value)}${playerTotal.soft ? " (soft)" : ""}\nDealer hand: ${dealerHand.map(label).join(" ")} → ${formatInteger(dealerTotal.value)}\nCards drawn: ${drawn.length > 0 ? drawn.join(", ") : "none"}\nCards remaining in shoe: ${formatInteger(pile.length)}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!blackjack [hit|stand ...]", "!blackjack hit stand"],
    examples: ["!blackjack", "!blackjack hit", "!blackjack hit hit stand"],
    permission: "public",
    cooldownMs: 2000,
  },
);
