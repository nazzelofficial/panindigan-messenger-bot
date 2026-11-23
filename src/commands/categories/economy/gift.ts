import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "gift",
    description: "Gift coins to another user with a note.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0];
      const amount = Number(context.args.positional[1]);
      const note = context.args.positional.slice(2).join(" ");
      if (!id || !/^\d{4,25}$/.test(id) || !Number.isSafeInteger(amount) || amount <= 0)
        return { text: "Usage: !gift <numeric Facebook ID> <positive amount> [note]." };
      try {
        const balance = await context.services.economy.transfer(
          context.senderId,
          id,
          amount,
          context.messageId,
        );
        return {
          text:
            "🎁 Gifted " +
            formatInteger(amount) +
            " coins to " +
            id +
            (note ? " with note: " + note : "") +
            ".\nYour balance: " +
            formatInteger(balance),
        };
      } catch (error) {
        return {
          text: "Gift failed: " + (error instanceof Error ? error.message : "unknown error"),
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!gift <userId> <amount> [note]"],
    examples: ["!gift 123456789 50 Happy birthday"],
    permission: "public",
    cooldownMs: 1500,
    maintenanceSafe: false,
    module: "economy",
  },
);
