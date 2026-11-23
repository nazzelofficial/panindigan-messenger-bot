import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "crime",
    description: "Attempt a risky coin heist with real odds.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const repository = context.databases.economy;
      const user = await context.services.users?.upsert(context.senderId);
      if (!repository || !user) return { text: "The economy is not available right now." };
      const key =
        context.databases.redis?.keys.cooldown("user", context.senderId, "crime") ??
        "crime:" + context.senderId;
      const lock = await context.services.cooldowns.acquire(key, 30 * 60_000);
      if (!lock.allowed)
        return {
          text:
            "You can attempt another heist in " + Math.ceil(lock.remainingMs / 60000) + " minutes.",
        };
      const roll = Math.random();
      const settings = context.config.economy.activities.work;
      const amount = Math.max(
        1,
        Math.floor(
          settings.minimumPayout +
            Math.random() * (settings.maximumPayout - settings.minimumPayout),
        ),
      );
      if (roll < 0.45) {
        const result = await repository.applyTransaction({
          userId: user.id,
          amount,
          type: "crime_success",
          description: "Successful heist",
          idempotencyKey: context.messageId,
        });
        return {
          text:
            "🕵️ The heist succeeded. You escaped with " +
            formatInteger(amount) +
            " coins. Balance: " +
            formatInteger(result.balance),
        };
      }
      const loss = Math.min(Math.floor(amount / 2), await repository.getBalance(user.id));
      if (loss > 0)
        await repository.applyTransaction({
          userId: user.id,
          amount: -loss,
          type: "crime_failure",
          description: "Failed heist fine",
          idempotencyKey: context.messageId,
        });
      return {
        text:
          "🚔 The heist failed. You paid a fine of " +
          formatInteger(loss) +
          " coins. No further balance change was made.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!crime"],
    examples: ["!crime"],
    permission: "public",
    cooldownMs: 5000,
    maintenanceSafe: false,
    module: "economy",
  },
);
