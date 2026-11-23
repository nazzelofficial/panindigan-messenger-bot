import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "inventory",
    description: "Show the items you own.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const items = (await context.services.economy.inventory(context.senderId)) as Array<
        Record<string, unknown>
      >;
      if (!items.length) return { text: "Your inventory is empty." };
      return {
        text:
          "🎒 INVENTORY\n\n" +
          items
            .map((item) => String(item.name) + " × " + formatInteger(Number(item.quantity)))
            .join("\n"),
      };
    },
  },
  {
    aliases: [],
    usage: ["!inventory"],
    examples: ["!inventory"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
