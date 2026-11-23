import { arch, cpus, freemem, loadavg, platform, release, totalmem, uptime } from "node:os";
import { formatInteger } from "../../../utils/text.js";
import { formatDuration } from "../../../utils/time.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "serverstats",
    description: "Report host-level CPU, memory and load figures for the machine running the bot.",
    category: "information",
    async run(_context: CommandContext): Promise<CommandResult> {
      const processors = cpus();
      const total = totalmem();
      const free = freemem();
      const usedPercent = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
      const lines = [
        "Host statistics",
        `OS: ${platform()} ${release()} (${arch()})`,
        `CPU: ${processors.length} logical core(s)${processors[0]?.model ? ` — ${processors[0].model}` : ""}`,
        `Memory: ${formatInteger((total - free) / 1024 / 1024)} MiB used of ${formatInteger(total / 1024 / 1024)} MiB (${usedPercent}%)`,
        `Host uptime: ${formatDuration(uptime() * 1000)}`,
        `Load average: ${loadavg()
          .map((value) => value.toFixed(2))
          .join(" / ")}`,
      ];
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!serverstats"],
    examples: ["!serverstats"],
    permission: "public",
    cooldownMs: 2000,
  },
);
