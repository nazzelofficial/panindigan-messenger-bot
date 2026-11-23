import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "latency",
    description: "Report the delay between the incoming event and this response.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      return {
        text:
          "📶 Latency: " +
          Math.max(0, Date.now() - context.eventTimestamp) +
          " ms (event to response)",
      };
    },
  },
  {
    aliases: [],
    usage: ["!latency"],
    examples: ["!latency"],
    permission: "public",
    cooldownMs: 700,
    maintenanceSafe: true,
  },
);
