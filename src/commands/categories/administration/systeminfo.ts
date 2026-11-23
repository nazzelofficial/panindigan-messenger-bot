import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import os from "node:os";

export default createCommand(
  {
    name: "systeminfo",
    description: "Show operating system and runtime information.",
    category: "administration",
    async run(_context: CommandContext): Promise<CommandResult> {
      return {
        text: [
          "🖥️ SYSTEM INFORMATION",
          "",
          "Hostname: " + os.hostname(),
          "Platform: " + os.platform() + " " + os.release() + " (" + os.arch() + ")",
          "Node: " + process.version,
          "CPU cores: " + os.cpus().length,
          "Total memory: " + Math.round(os.totalmem() / 1073741824) + " GB",
          "Free memory: " + Math.round(os.freemem() / 1073741824) + " GB",
          "Timezone: " + Intl.DateTimeFormat().resolvedOptions().timeZone,
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!systeminfo"],
    examples: ["!systeminfo"],
    permission: "admin",
    cooldownMs: 1200,
    maintenanceSafe: true,
  },
);
