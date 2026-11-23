import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "sticker",
    description: "Send an existing Messenger sticker by its numeric sticker ID.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const stickerId = context.args.positional[0];
      if (!stickerId || !/^\d{5,25}$/.test(stickerId)) {
        return {
          text: "Usage: !sticker <numeric sticker ID>. You can copy the ID from a sticker message in the Messenger app.",
        };
      }
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected, so no sticker could be sent." };
      try {
        const result = await client.sendSticker(context.threadId, stickerId);
        return { text: `Sticker ${stickerId} sent (message ${result.messageId}).` };
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        return {
          text: `Messenger rejected sticker ${stickerId}: ${message}. No sticker was sent.`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!sticker <sticker ID>"],
    examples: ["!sticker 3692404857629451"],
    permission: "public",
    cooldownMs: 2000,
  },
);
