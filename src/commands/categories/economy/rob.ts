import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "rob",
    description: "Attempt to rob another user; failure costs you coins.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const targetId = context.args.positional[0];
      if (!targetId || !/^\d{4,25}$/.test(targetId))
        return { text: "Usage: !rob <numeric Facebook ID>." };
      if (targetId === context.senderId) return { text: "You cannot rob yourself." };
      const repository = context.databases.economy;
      const [source, target] = await Promise.all([
        context.services.users?.upsert(context.senderId),
        context.services.users?.upsert(targetId),
      ]);
      if (!repository || !source || !target)
        return { text: "The economy is not available right now." };
      const key =
        context.databases.redis?.keys.cooldown("user", context.senderId, "rob") ??
        "rob:" + context.senderId;
      const lock = await context.services.cooldowns.acquire(key, 60 * 60_000);
      if (!lock.allowed)
        return {
          text:
            "You can attempt another robbery in " +
            Math.ceil(lock.remainingMs / 60000) +
            " minutes.",
        };
      const targetBalance = await repository.getBalance(target.id);
      if (targetBalance < 10) return { text: "That account does not have enough coins to rob." };
      const amount = Math.min(
        targetBalance,
        Math.max(10, Math.floor(targetBalance * (0.05 + Math.random() * 0.1))),
      );
      if (Math.random() < 0.4) {
        try {
          await repository.transfer({
            fromUserId: target.id,
            toUserId: source.id,
            amount,
            idempotencyKey: "rob:" + context.messageId,
          });
          return { text: "💸 You got away with " + formatInteger(amount) + " coins." };
        } catch (error) {
          return {
            text:
              "The robbery failed to complete: " +
              (error instanceof Error ? error.message : "unknown error"),
          };
        }
      }
      const fine = Math.min(await repository.getBalance(source.id), Math.floor(amount / 2));
      if (fine > 0)
        await repository.applyTransaction({
          userId: source.id,
          amount: -fine,
          type: "rob_fine",
          description: "Failed robbery fine",
          idempotencyKey: "rob:" + context.messageId,
        });
      return { text: "🚨 You were caught and paid a fine of " + formatInteger(fine) + " coins." };
    },
  },
  {
    aliases: [],
    usage: ["!rob <userId>"],
    examples: ["!rob 123456789"],
    permission: "public",
    cooldownMs: 8000,
    maintenanceSafe: false,
    module: "economy",
  },
);
