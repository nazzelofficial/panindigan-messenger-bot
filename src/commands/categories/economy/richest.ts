import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "richest",
    description: "Show the top coin holders.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const limit = Math.min(25, Math.max(1, Number(context.args.positional[0] ?? 10) || 10));
      const rows = (await context.services.economy.leaderboard(limit)) as Array<
        Record<string, unknown>
      >;
      return {
        text: rows.length
          ? "💎 RICHEST\n\n" +
            rows
              .map(
                (row, i) =>
                  i +
                  1 +
                  ". " +
                  String(row.facebook_id) +
                  " — " +
                  formatInteger(Number(row.balance)),
              )
              .join("\n")
          : "No balances yet.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!richest [limit]"],
    examples: ["!richest 5"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
