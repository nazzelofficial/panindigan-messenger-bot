import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "permissions",
    description: "Show owner, administrator and allowlist policy.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      return {
        text: [
          "🔐 PERMISSIONS",
          "",
          "Owners: " + (context.services.permissions.ownersList().join(", ") || "none"),
          "Administrators: " +
            (context.services.permissions.administratorsList().join(", ") || "none"),
          "User allowlist: " + context.config.permissions.userAllowlist.enabled,
          "Group allowlist: " + context.config.permissions.groupAllowlist.enabled,
          "Require both lists: " + context.config.permissions.requireBothListsWhenBothEnabled,
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!permissions"],
    examples: ["!permissions"],
    permission: "admin",
    cooldownMs: 1200,
    maintenanceSafe: true,
  },
);
