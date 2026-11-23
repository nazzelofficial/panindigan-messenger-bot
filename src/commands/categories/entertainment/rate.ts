import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

function verdict(score: number): string {
  if (score >= 95) return "absolutely flawless";
  if (score >= 80) return "seriously impressive";
  if (score >= 60) return "solidly above average";
  if (score >= 40) return "respectably middling";
  if (score >= 20) return "needs a little work";
  return "a bold artistic choice";
}

export default createCommand(
  {
    name: "rate",
    description:
      "Give a deterministic 0–100 rating for any word or phrase with a matching verdict.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const subject = context.args.raw.trim();
      if (subject.length === 0) {
        return {
          text: "📊 **Rate**\nUsage: `!rate <anything>`\nExample: `!rate pineapple pizza`\nThe same text always receives the same score.",
        };
      }
      const score = parseInt(sha256(`rate:${subject.toLowerCase()}`).slice(0, 8), 16) % 101;
      return {
        text: `📊 **Rate: "${subject}"**\n\nScore: **${formatInteger(score)}/100** — ${verdict(score)}\nCharacters: ${formatInteger(subject.length)} · Based on a stable hash of your exact input.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!rate <subject>", "!rate pineapple pizza"],
    examples: ["!rate pineapple pizza", "!rate monday mornings"],
    permission: "public",
    cooldownMs: 1000,
  },
);
