import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "status",
    description: "Show the real health of the bot and every database.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const health = await context.databases.health();
      const snapshot = await context.services.maintenance.currentStatus();
      const line = (name: string, state: string) => name + ": " + state;
      const lines = [
        "🟢 PANINDIGAN STATUS",
        "",
        "Bot: Online",
        "Messenger: " + (context.messenger.isConnected ? "Connected" : "Disconnected"),
      ];
      for (const entry of health)
        lines.push(
          line(
            entry.name,
            entry.state === "connected"
              ? "Connected"
              : entry.state === "degraded"
                ? "Degraded"
                : "Disconnected",
          ),
        );
      lines.push(
        "",
        "Maintenance: " + snapshot.status,
        "Commands: " + (snapshot.status === "ACTIVE" ? "Temporarily unavailable" : "Operational"),
      );
      if (snapshot.status === "ACTIVE" && snapshot.record) {
        lines.push(
          "",
          "Title: " + snapshot.record.title,
          "Expected completion: " + new Date(snapshot.endsAt!).toISOString(),
          "Timezone: " + context.config.maintenance.timezone,
        );
      }
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!status"],
    examples: ["!status"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: true,
  },
);
