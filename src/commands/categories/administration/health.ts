import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "health",
    description: "Run health checks against every configured dependency.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const health = await context.databases.health();
      const lines = health.map(
        (h) => h.name + ": " + h.state.toUpperCase() + (h.detail ? " — " + h.detail : ""),
      );
      lines.unshift(
        context.messenger.health().name + ": " + context.messenger.health().state.toUpperCase(),
      );
      const degraded =
        health.some((h) => h.state !== "connected") || !context.messenger.isConnected;
      lines.push(
        "",
        degraded ? "⚠️ One or more dependencies are degraded." : "✅ All dependencies are healthy.",
      );
      return { text: "🏥 HEALTH\n\n" + lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!health"],
    examples: ["!health"],
    permission: "admin",
    cooldownMs: 2000,
    maintenanceSafe: true,
  },
);
