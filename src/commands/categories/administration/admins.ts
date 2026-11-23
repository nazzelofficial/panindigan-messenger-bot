import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "admins",
    description: "List configured owners and administrators.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      return {
        text: [
          "👥 PRIVILEGED ACCOUNTS",
          "",
          "Owners: " + (context.services.permissions.ownersList().join(", ") || "none"),
          "Administrators: " +
            (context.services.permissions.administratorsList().join(", ") || "none"),
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!admins"],
    examples: ["!admins"],
    permission: "public",
    cooldownMs: 1000,
    maintenanceSafe: true,
  },
);
