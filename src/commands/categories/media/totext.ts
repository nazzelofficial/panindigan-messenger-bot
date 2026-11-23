import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "totext",
    description: "Explain the missing OCR provider instead of pretending text was extracted.",
    category: "media",
    async run(_context: CommandContext): Promise<CommandResult> {
      return {
        text:
          "No OCR provider is configured in this build, so no text was extracted and no image was read. " +
          "To enable image-to-text, add an OCR service URL and API key to the bot environment (for example OCR_API_URL and OCR_API_KEY), " +
          "expose a typed OCR wrapper on context.services, then re-enable this command. " +
          "Until then, use !toimage to send the image or !media to see the supported media commands.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!totext"],
    examples: ["!totext"],
    permission: "public",
    cooldownMs: 2000,
  },
);
