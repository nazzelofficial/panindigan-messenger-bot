import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatDateTime } from "../../../utils/time.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "coinhistory",
    description: "Show your recent coin transactions.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const limit = Math.min(30, Math.max(1, Number(context.args.positional[0] ?? 10) || 10));
      const rows = (await context.services.economy.history(context.senderId, limit)) as Array<
        Record<string, unknown>
      >;
      if (!rows.length) return { text: "No coin transactions recorded yet." };
      return {
        text:
          "📜 COIN HISTORY\n\n" +
          rows
            .map(
              (row) =>
                (Number(row.amount) >= 0 ? "+" : "") +
                formatInteger(Number(row.amount)) +
                " | " +
                String(row.description) +
                " | " +
                formatDateTime(
                  new Date(String(row.created_at)).getTime(),
                  context.config.application.timezone,
                ),
            )
            .join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!coinhistory [limit]"],
    examples: ["!coinhistory 10"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
