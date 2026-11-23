import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

const CHOICES: readonly string[] = ["rock", "paper", "scissors"];
const EMOJI: Readonly<Record<string, string>> = { rock: "✊", paper: "✋", scissors: "✌️" };
const ALIASES: Readonly<Record<string, string>> = {
  r: "rock",
  p: "paper",
  s: "scissors",
  rock: "rock",
  paper: "paper",
  scissors: "scissors",
};

export default createCommand(
  {
    name: "rps",
    description: "Play rock-paper-scissors against the bot with a cryptographically random throw.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      if (raw === undefined) {
        return {
          text: "✊ **Rock Paper Scissors**\nUsage: `!rps rock|paper|scissors` (or `r`, `p`, `s`).\nExample: `!rps rock`",
        };
      }
      const player = ALIASES[raw.toLowerCase()];
      if (player === undefined)
        return { text: "❌ Choose rock, paper or scissors (aliases: r, p, s)." };
      const bot = pickRandom(CHOICES);
      let outcome: string;
      if (player === bot) outcome = "🤝 It's a tie!";
      else if (
        (player === "rock" && bot === "scissors") ||
        (player === "paper" && bot === "rock") ||
        (player === "scissors" && bot === "paper")
      )
        outcome = "🎉 You win!";
      else outcome = "🤖 Bot wins!";
      const rounds = context.args.positional.slice(1);
      let extra = "";
      if (rounds.length > 0) {
        let wins = 0;
        let losses = 0;
        let ties = 0;
        const results: string[] = [];
        for (const round of [raw, ...rounds]) {
          const choice = ALIASES[round.toLowerCase()];
          if (choice === undefined) {
            results.push(`❓ ${round}`);
            continue;
          }
          const rival = pickRandom(CHOICES);
          if (choice === rival) {
            ties += 1;
            results.push(`🤝 ${choice}/${rival}`);
          } else if (
            (choice === "rock" && rival === "scissors") ||
            (choice === "paper" && rival === "rock") ||
            (choice === "scissors" && rival === "paper")
          ) {
            wins += 1;
            results.push(`🎉 ${choice}/${rival}`);
          } else {
            losses += 1;
            results.push(`😞 ${choice}/${rival}`);
          }
        }
        extra = `\n\nBest-of-${formatInteger(results.length)}: ${formatInteger(wins)}W / ${formatInteger(losses)}L / ${formatInteger(ties)}D\n${results.join(" · ")}`;
      }
      return {
        text: `✊ **Rock Paper Scissors** — ${outcome}\n\nYou: ${EMOJI[player]} ${player}\nBot: ${EMOJI[bot]} ${bot}${extra}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!rps <rock|paper|scissors> [more throws...]", "!rps rock paper scissors"],
    examples: ["!rps rock", "!rps paper", "!rps rock scissors paper"],
    permission: "public",
    cooldownMs: 1000,
  },
);
