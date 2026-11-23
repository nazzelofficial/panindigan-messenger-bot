import { arch, platform } from "node:os";
import { formatInteger } from "../../../utils/text.js";
import { formatDuration } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "botstats",
    description: "Show live process statistics for this running bot instance.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const memory = process.memoryUsage();
      const lines = [
        "Bot process statistics",
        `Uptime: ${formatDuration(process.uptime() * 1000)}`,
        `Node: ${process.version} on ${platform()}/${arch()}`,
        `RSS memory: ${formatInteger(memory.rss / 1024 / 1024)} MiB`,
        `Heap used: ${formatInteger(memory.heapUsed / 1024 / 1024)} MiB of ${formatInteger(memory.heapTotal / 1024 / 1024)} MiB`,
        `Messenger: ${context.messenger.isConnected ? "connected" : "disconnected"}`,
        `Authenticated as: ${context.messenger.currentUserId || "unknown"}`,
      ];
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!botstats"],
    examples: ["!botstats"],
    permission: "public",
    cooldownMs: 2000,
  },
);
