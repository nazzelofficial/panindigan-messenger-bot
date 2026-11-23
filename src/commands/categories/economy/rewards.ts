import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "rewards",
    description: "Show configured reward amounts and cooldowns.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const e = context.config.economy;
      return {
        text: [
          "🎁 REWARDS",
          "",
          "Daily: " + e.rewards.daily.amount + " coins / " + e.rewards.daily.cooldownHours + "h",
          "Weekly: " + e.rewards.weekly.amount + " coins / " + e.rewards.weekly.cooldownHours + "h",
          "Monthly: " + e.rewards.monthly.amount + " coins (" + e.rewards.monthly.resetPolicy + ")",
          "Work: " +
            e.activities.work.minimumPayout +
            "–" +
            e.activities.work.maximumPayout +
            " / " +
            e.activities.work.cooldownMinutes +
            "m",
          "Beg: " +
            e.activities.beg.minimumPayout +
            "–" +
            e.activities.beg.maximumPayout +
            " / " +
            e.activities.beg.cooldownHours +
            "h",
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!rewards"],
    examples: ["!rewards"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
