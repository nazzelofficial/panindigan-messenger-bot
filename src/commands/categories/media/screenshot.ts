import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "screenshot",
    description: "Explain the missing screenshot provider instead of claiming a capture happened.",
    category: "media",
    async run(_context: CommandContext): Promise<CommandResult> {
      return {
        text:
          "No headless-browser or screenshot provider is configured in this build, so no screenshot was captured. " +
          "To enable it, configure a screenshot service (for example a self-hosted browser renderer) through SCREENSHOT_API_URL and SCREENSHOT_API_KEY " +
          "in the bot environment, expose a typed screenshot wrapper on context.services, then re-enable this command. " +
          "No image or URL has been fabricated.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!screenshot"],
    examples: ["!screenshot"],
    permission: "public",
    cooldownMs: 5000,
  },
);
