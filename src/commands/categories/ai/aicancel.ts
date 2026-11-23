import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "aicancel",
    description: "Request cancellation of an in-flight AI request.",
    category: "ai",
    async run(context: CommandContext): Promise<CommandResult> {
      const key = context.args.positional[0];
      if (!key)
        return { text: "Usage: !aicancel <request key>. The key is shown in the request record." };
      try {
        const cancelled = await context.services.ai.cancel(key, context.senderId);
        return {
          text: cancelled
            ? "Cancellation signal sent for " + key + "."
            : "No active request with that key was found.",
        };
      } catch (error) {
        return {
          text:
            "Cancellation failed: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!aicancel <requestKey>"],
    examples: ["!aicancel ai_abc123"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "artificialIntelligence",
  },
);
