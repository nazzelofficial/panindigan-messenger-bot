import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "economy",
    description: "Show the economy module's status and configuration.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const e = context.config.economy;
      return {
        text: [
          "💹 ECONOMY",
          "",
          "Status: " + (e.enabled && context.config.modules.economy ? "enabled" : "disabled"),
          "Currency: " + e.currencyLabel,
          "Daily: " + e.rewards.daily.amount,
          "Weekly: " + e.rewards.weekly.amount,
          "Monthly: " + e.rewards.monthly.amount,
          "Shop items: " + (await context.services.economy.shopItems()).length,
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!economy"],
    examples: ["!economy"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
