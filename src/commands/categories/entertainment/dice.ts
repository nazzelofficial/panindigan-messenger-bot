import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { randomInt } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "dice",
    description: "Roll dice using standard NdS notation with cryptographically random results.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const raw = context.args.positional[0];
      if (raw === undefined) {
        return {
          text: "🎲 **Dice**\nUsage: `!dice <count>d<sides>`, e.g. `!dice 2d6`, `!dice 4d20`.\nLimits: 1–20 dice, 2–100 sides.",
        };
      }
      const match = /^(\d{1,2})d(\d{1,3})$/i.exec(raw.trim());
      if (match === null)
        return { text: "❌ Use NdS notation, e.g. `!dice 2d6` (two six-sided dice)." };
      const count = Number(match[1]);
      const sides = Number(match[2]);
      if (count < 1 || count > 20) return { text: "❌ Dice count must be between 1 and 20." };
      if (sides < 2 || sides > 100) return { text: "❌ Sides must be between 2 and 100." };
      const rolls = Array.from({ length: count }, () => randomInt(1, sides));
      const sum = rolls.reduce((total, roll) => total + roll, 0);
      const maximum = count * sides;
      return {
        text: `🎲 **Dice — ${formatInteger(count)}d${formatInteger(sides)}**\n\nRolls: ${rolls.map((roll) => formatInteger(roll)).join(" + ")}\nTotal: **${formatInteger(sum)}** / ${formatInteger(maximum)}\nAverage roll: ${(sum / count).toFixed(2)}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!dice <count>d<sides>", "!dice 2d6"],
    examples: ["!dice 1d20", "!dice 3d6", "!dice 4d10"],
    permission: "public",
    cooldownMs: 1000,
  },
);
