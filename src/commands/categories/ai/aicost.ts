import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "aicost",
    description: "Show coin costs and request quotas for each AI level.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const svc = context.services.ai;
      const levels = ["ask1", "ask2", "ask3", "ask4", "ask5", "ask6"] as const;
      const rows = levels.map((level) => {
        const q = svc.quota(level);
        return (
          level +
          ": " +
          formatInteger(svc.coinCost(level)) +
          " coins · " +
          formatInteger(q.maximumRequests) +
          " requests / " +
          q.periodHours +
          "h" +
          (level === "ask6" ? " (no application limit)" : "")
        );
      });
      return {
        text:
          "💰 AI COSTS\n\n" +
          rows.join("\n") +
          "\n\nFailed requests are charged then fully refunded.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!aicost"],
    examples: ["!aicost"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
