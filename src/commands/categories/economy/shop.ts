import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { formatInteger } from "../../../utils/text.js";

export default createCommand(
  {
    name: "shop",
    description: "List items available for purchase.",
    category: "economy",
    async run(context: CommandContext): Promise<CommandResult> {
      const items = (await context.services.economy.shopItems()) as Array<Record<string, unknown>>;
      if (!items.length) return { text: "The shop has no active items." };
      return {
        text:
          "🛒 SHOP\n\n" +
          items
            .map(
              (item) =>
                String(item.id) +
                ". " +
                String(item.name) +
                " — " +
                formatInteger(Number(item.price)) +
                " coins\n   " +
                String(item.description),
            )
            .join("\n") +
          "\n\nBuy with !buy <item id>.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!shop"],
    examples: ["!shop"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
    module: "economy",
  },
);
