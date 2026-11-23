import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "coinflip",
    description: "Flip a fair coin, or run a best-of series and count the real results.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      let flips = 1;
      if (raw !== undefined) {
        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
          return {
            text: "❌ Flip count must be a whole number from 1 to 50, e.g. `!coinflip 10`.",
          };
        }
        flips = parsed;
      }
      const results = Array.from({ length: flips }, () =>
        randomInt(0, 1) === 0 ? "Heads" : "Tails",
      );
      const heads = results.filter((result) => result === "Heads").length;
      const tails = flips - heads;
      if (flips === 1) {
        return { text: `🪙 **Coin Flip** — ${results[0] === "Heads" ? "🪙 Heads" : "🪙 Tails"}!` };
      }
      return {
        text: `🪙 **Coin Flip Series** — ${formatInteger(flips)} flips\n\n${results.join(" · ")}\n\nHeads: ${formatInteger(heads)} · Tails: ${formatInteger(tails)}\nWinner: ${heads > tails ? "Heads" : tails > heads ? "Tails" : "A tie"}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!coinflip [flips]", "!coinflip 10"],
    examples: ["!coinflip", "!coinflip 5"],
    permission: "public",
    cooldownMs: 1000,
  },
);
