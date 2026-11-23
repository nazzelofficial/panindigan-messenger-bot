import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "maintenanceconfig",
    description: "Show the active maintenance policy.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      return { text: JSON.stringify(context.services.maintenance.configuration(), null, 2) };
    },
  },
  {
    aliases: [],
    usage: ["!maintenanceconfig"],
    examples: ["!maintenanceconfig"],
    permission: "owner",
    cooldownMs: 1000,
    maintenanceSafe: true,
    module: "maintenance",
  },
);
