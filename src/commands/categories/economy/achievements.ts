import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "achievements",
    description: "Show achievements earned from real account data.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const [wallet, level, activity] = await Promise.all([
        context.services.economy.balance(context.senderId),
        context.services.leveling.get(context.senderId).catch(() => undefined),
        context.databases.operational?.commandTotals(50).catch(() => []),
      ]);
      const badges = [];
      if (wallet >= 1000) badges.push("💰 First Thousand — 1,000 coins");
      if (wallet >= 10000) badges.push("🏦 Tycoon — 10,000 coins");
      if (level && level.level >= 10) badges.push("⭐ Veteran — level 10");
      if (level && Number(level.total_xp) >= 5000) badges.push("📚 Scholar — 5,000 lifetime XP");
      if (activity && activity.length > 0) badges.push("🤖 Regular — recorded command history");
      return {
        text:
          "🏅 ACHIEVEMENTS\n\n" +
          (badges.length ? badges.join("\n") : "No achievements yet. Keep participating."),
      };
    },
  },
  {
    aliases: [],
    usage: ["!achievements"],
    examples: ["!achievements"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
