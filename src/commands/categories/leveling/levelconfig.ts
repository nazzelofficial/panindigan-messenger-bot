import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "levelconfig",
    description:
      "Administrator-only: display the real leveling configuration available in this build.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      return {
        text:
          "⚙️ Leveling configuration (read from this build)\n" +
          `Module enabled: ${context.config.modules.leveling ? "yes" : "no"}\n` +
          "XP formula in use: level = floor(sqrt(current XP / 100)) + 1, with a minimum of level 1.\n" +
          "Level thresholds: level N begins at (N-1)² × 100 XP; level 1 begins at 0 XP.\n" +
          "Config values are loaded from config.json and no extra leveling thresholds are defined there.\n" +
          "No settings were modified. Use !setxp, !addxp, !removexp or !resetxp to change XP, and !setxpboost or !removeboost for boosts.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!levelconfig"],
    examples: ["!levelconfig"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
