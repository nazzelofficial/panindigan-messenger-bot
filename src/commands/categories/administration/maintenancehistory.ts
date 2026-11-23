import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "maintenancehistory",
    description: "Show the maintenance action history.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const rows = await context.services.maintenance.history(undefined, 20);
      return {
        text: rows.length
          ? "🕘 MAINTENANCE HISTORY\n\n" + JSON.stringify(rows, null, 2).slice(0, 1800)
          : "No maintenance history yet.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!maintenancehistory"],
    examples: ["!maintenancehistory"],
    permission: "admin",
    cooldownMs: 1500,
    maintenanceSafe: true,
    module: "maintenance",
  },
);
