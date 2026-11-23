import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatDateTime } from "../../../utils/time.js";

export default createCommand(
  {
    name: "dailyinfo",
    description: "Show when each reward is next available.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const user = await context.services.users?.upsert(context.senderId);
      const repository = context.databases.economy;
      if (!user || !repository) return { text: "Reward information is not available right now." };
      const lines = [];
      for (const type of ["daily", "weekly", "monthly"] as const) {
        const next = await repository.nextEligible(user.id, type);
        lines.push(
          type +
            ": " +
            (next ? formatDateTime(next, context.config.application.timezone) : "available now"),
        );
      }
      return { text: "🗓️ REWARD SCHEDULE\n\n" + lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!dailyinfo"],
    examples: ["!dailyinfo"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
