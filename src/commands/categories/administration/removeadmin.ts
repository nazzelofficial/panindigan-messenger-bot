import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "removeadmin",
    description: "Revoke administrator permission from a user (owner only).",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0];
      if (!id || !/^\d{4,25}$/.test(id))
        return { text: "Usage: !removeadmin <numeric Facebook ID>." };
      await context.services.permissions.setRole(context.senderId, id, "admin", false);
      return { text: "Revoked administrator permission from " + id + "." };
    },
  },
  {
    aliases: [],
    usage: ["!removeadmin <userId>"],
    examples: ["!removeadmin 123456789"],
    permission: "owner",
    cooldownMs: 1000,
    maintenanceSafe: true,
  },
);
