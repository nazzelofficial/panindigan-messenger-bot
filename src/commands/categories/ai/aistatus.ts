import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "aistatus",
    description: "Show AI provider status and the active model.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const svc = context.services.ai;
      return {
        text: [
          "🤖 AI STATUS",
          "",
          "Module: " + (context.config.artificialIntelligence.enabled ? "enabled" : "disabled"),
          "Provider: " + svc.providerName(),
          "Configured: " + (svc.isConfigured() ? "yes" : "no"),
          "Default model: " + (svc.defaultModel() || "not configured"),
          "Request timeout: " + context.config.artificialIntelligence.requestTimeoutMs + " ms",
          "Max concurrent requests: " +
            context.config.artificialIntelligence.maximumConcurrentRequests,
          "ask6: zero coins, no application request-count limit",
        ].join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!aistatus"],
    examples: ["!aistatus"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
