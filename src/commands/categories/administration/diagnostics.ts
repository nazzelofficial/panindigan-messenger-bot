import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "diagnostics",
    description: "Show runtime diagnostics for administrators.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const health = await context.databases.health();
      return {
        text: [
          "🔬 DIAGNOSTICS",
          "",
          "Node: " + process.version,
          "Platform: " + process.platform + " " + process.arch,
          "Memory (MB): " + Math.round(process.memoryUsage().rss / 1048576),
          "Messenger connected: " + context.messenger.isConnected,
          "Databases: " + health.map((h) => h.name + "=" + h.state).join(", "),
          "Event: " + context.messageId,
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!diagnostics"],
    examples: ["!diagnostics"],
    permission: "admin",
    cooldownMs: 2000,
    maintenanceSafe: true,
  },
);
