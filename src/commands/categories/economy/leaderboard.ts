import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "leaderboard",
    description: "Show the richest users by wallet balance.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const limit = Math.min(25, Math.max(1, Number(context.args.positional[0] ?? 10) || 10));
      const rows = (await context.services.economy.leaderboard(limit)) as Array<
        Record<string, unknown>
      >;
      if (!rows.length) return { text: "No balances have been recorded yet." };
      return {
        text:
          "🏆 RICHEST USERS\n\n" +
          rows
            .map(
              (row, i) =>
                i + 1 + ". " + String(row.facebook_id) + " — " + formatInteger(Number(row.balance)),
            )
            .join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!leaderboard [limit]"],
    examples: ["!leaderboard 10"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
