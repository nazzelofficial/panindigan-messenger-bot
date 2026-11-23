import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "trade",
    description: "Request a coin trade with a confirmation step.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0];
      const amount = Number(context.args.positional[1]);
      if (!id || !/^\d{4,25}$/.test(id) || !Number.isSafeInteger(amount) || amount <= 0)
        return { text: "Usage: !trade <numeric Facebook ID> <positive amount>." };
      const key = "trade:confirm:" + context.senderId;
      const pending = await context.services.cache.get(key);
      const signature = id + ":" + amount;
      if (pending !== signature) {
        await context.services.cache.set(key, signature, 120);
        return {
          text:
            "Trade request: " +
            formatInteger(amount) +
            " coins to " +
            id +
            ". Repeat the same command within 2 minutes to confirm.",
        };
      }
      await context.services.cache.delete(key);
      try {
        const balance = await context.services.economy.transfer(
          context.senderId,
          id,
          amount,
          context.messageId,
        );
        return {
          text:
            "🤝 Trade complete: " +
            formatInteger(amount) +
            " coins sent to " +
            id +
            ". Balance: " +
            formatInteger(balance),
        };
      } catch (error) {
        return {
          text: "Trade failed: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!trade <userId> <amount>"],
    examples: ["!trade 123456789 100"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
