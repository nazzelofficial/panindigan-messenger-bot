import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatDuration } from "../../../utils/time.js";

export default createCommand(
  {
    name: "cooldowns",
    description: "Show active reward and activity cooldowns.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const redis = context.databases.redis?.raw();
      const keys = ["daily", "weekly", "monthly", "work", "beg", "crime", "rob"];
      const lines = [];
      for (const type of keys) {
        const key = context.databases.redis?.keys.rewardLock(context.senderId, type) ?? "";
        const ttl = redis && key ? await redis.pTTL(key).catch(() => -2) : -2;
        lines.push(type + ": " + (ttl > 0 ? formatDuration(ttl) : "ready"));
      }
      return { text: "⏳ COOLDOWNS\n\n" + lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!cooldowns"],
    examples: ["!cooldowns"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
