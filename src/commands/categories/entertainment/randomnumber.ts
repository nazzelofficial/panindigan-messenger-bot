import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "randomnumber",
    description:
      "Generate a cryptographically random integer inside an inclusive range you choose.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const [rawMinimum, rawMaximum] = context.args.positional;
      if (rawMinimum === undefined || rawMaximum === undefined) {
        return {
          text: "🔢 **Random Number**\nUsage: `!randomnumber <min> <max>`\nExample: `!randomnumber 1 100`\nBoth bounds are inclusive.",
        };
      }
      const minimum = Number(rawMinimum);
      const maximum = Number(rawMaximum);
      if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)) {
        return { text: "❌ Both bounds must be whole numbers, e.g. `!randomnumber 1 100`." };
      }
      if (minimum > maximum)
        return { text: "❌ The minimum must be less than or equal to the maximum." };
      if (maximum - minimum > 1_000_000_000)
        return { text: "❌ Range is too wide — keep it within one billion values." };
      const value = randomInt(minimum, maximum);
      const position = ((value - minimum) / (maximum - minimum + 1)) * 100;
      return {
        text: `🔢 **Random Number** — **${formatInteger(value)}**\n\nRange: ${formatInteger(minimum)} – ${formatInteger(maximum)} (inclusive)\nPosition in range: ${position.toFixed(2)}%`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!randomnumber <min> <max>", "!randomnumber 1 100"],
    examples: ["!randomnumber 1 6", "!randomnumber 1 1000"],
    permission: "public",
    cooldownMs: 1000,
  },
);
