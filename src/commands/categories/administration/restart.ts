import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "restart",
    description: "Request a graceful process restart (owner only).",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      context.logger.warn({ actor: context.senderId }, "Graceful restart requested");
      await context.services.cache.set("runtime:restart:requested", Date.now(), 300);
      setTimeout(
        () => process.exit(0),
        Math.max(1000, context.config.messengerRecovery.shutdownGracePeriodMs * 2),
      );
      return {
        text: "🔄 Restart requested. The process will exit gracefully and the supervisor should bring it back.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!restart"],
    examples: ["!restart"],
    permission: "owner",
    cooldownMs: 2000,
    maintenanceSafe: false,
  },
);
