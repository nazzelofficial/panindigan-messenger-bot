import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "setadmin",
    description: "Grant administrator permission to a user (owner only).",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0];
      if (!id || !/^\d{4,25}$/.test(id)) return { text: "Usage: !setadmin <numeric Facebook ID>." };
      await context.services.permissions.setRole(context.senderId, id, "admin", true);
      return { text: "Granted administrator permission to " + id + "." };
    },
  },
  {
    aliases: [],
    usage: ["!setadmin <userId>"],
    examples: ["!setadmin 123456789"],
    permission: "owner",
    cooldownMs: 1000,
    maintenanceSafe: true,
  },
);
