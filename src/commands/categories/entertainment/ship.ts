import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

function verdict(score: number): string {
  if (score >= 95) return "💞 practically soulmates";
  if (score >= 80) return "❤️ an incredible match";
  if (score >= 65) return "💕 strong potential";
  if (score >= 45) return "💛 worth exploring";
  if (score >= 25) return "🧡 maybe with effort";
  return "💔 better as friends";
}

export default createCommand(
  {
    name: "ship",
    description:
      "Compute a deterministic compatibility score for two names using cryptographic hashing.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const [first, second] = context.args.positional;
      if (first === undefined || second === undefined) {
        return {
          text: "💘 **Ship**\nUsage: `!ship <name1> <name2>`\nExample: `!ship Ana Bruno`\nThe score is stable for the same pair of names.",
        };
      }
      const a = first.trim().toLowerCase();
      const b = second.trim().toLowerCase();
      if (a.length === 0 || b.length === 0) return { text: "❌ Provide two non-empty names." };
      const key = [a, b].sort().join("|");
      const score = parseInt(sha256(`ship:${key}`).slice(0, 8), 16) % 101;
      const shared = [...new Set(a)].filter((letter) => b.includes(letter)).length;
      const letters = new Set([...a, ...b]).size;
      return {
        text: `💘 **Ship: ${first} + ${second}**\n\nCompatibility: **${formatInteger(score)}%** — ${verdict(score)}\nShared letters: ${formatInteger(shared)} of ${formatInteger(letters)} unique letters\nVerdict is deterministic for this exact pair of names.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!ship <name1> <name2>", "!ship Ana Bruno"],
    examples: ["!ship Ana Bruno", "!ship Katana Miguel"],
    permission: "public",
    cooldownMs: 1000,
  },
);
