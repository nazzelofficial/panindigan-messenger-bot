import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "owner",
    description: "Show the configured bot owner accounts.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const owners = context.services.permissions.ownersList();
      return {
        text:
          "👑 Bot owner: " +
          (owners.length ? owners.join(", ") : "not configured") +
          "\nPublisher: " +
          context.config.identity.publisher.name,
      };
    },
  },
  {
    aliases: [],
    usage: ["!owner"],
    examples: ["!owner"],
    permission: "public",
    cooldownMs: 800,
    maintenanceSafe: true,
  },
);
