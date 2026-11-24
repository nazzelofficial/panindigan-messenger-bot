import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { panel, listItem } from "../../../utils/response.js";

const CATEGORY_EMOJI: Record<string, string> = {
  administration: "🛡️",
  moderation: "🔨",
  information: "ℹ️",
  utility: "🧰",
  automation: "⚙️",
  entertainment: "🎮",
  economy: "💰",
  leveling: "📈",
  games: "🎲",
  media: "🖼️",
  ai: "🤖",
};

export default createCommand(
  {
    name: "help",
    description: "Show the command catalogue or details for one command or category.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0]?.toLowerCase();
      const { CommandRegistry } = await import("../../registry.js");
      const { loadAllCommands } = await import("../../loader.js");
      const registry = new CommandRegistry();
      for (const command of loadAllCommands(context.config)) registry.register(command);
      if (requested) {
        const command = registry.resolve(requested);
        if (command) {
          const detailRows: Array<readonly [string, string | number]> = [];
          detailRows.push(["Usage", command.usage[0] ?? ""]);
          for (const usage of command.usage.slice(1)) detailRows.push(["", usage]);
          if (command.aliases.length) detailRows.push(["Aliases", command.aliases.join(", ")]);
          if (command.examples.length) detailRows.push(["Examples", command.examples.slice(0, 2).join(" · ")]);
          return {
            text: panel({
              title: command.name,
              tone: "info",
              subtitle: command.description,
              rows: detailRows,
              footer: `Cooldown ${command.cooldownMs}ms`,
            }),
          };
        }
        const byCategory = registry.byCategory(
          requested as Parameters<typeof registry.byCategory>[0],
        );
        if (byCategory.length > 0) {
          const pageSize = 12;
          const rawPage = Number.parseInt(context.args.positional[1] ?? "1", 10);
          const totalPages = Math.max(1, Math.ceil(byCategory.length / pageSize));
          const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, totalPages) : 1;
          const slice = byCategory.slice((page - 1) * pageSize, page * pageSize);
          const body = slice.map((c: { name: string; description: string }) => `▸ ${c.name}`);
          return {
            text: panel({
              title: requested.toUpperCase(),
              tone: "info",
              subtitle: `${byCategory.length} commands   ·   Page ${page}/${totalPages}`,
              lines: body,
              footer: page < totalPages ? `!help ${requested} ${page + 1} for more` : "End of list",
            }),
          };
        }
        return { text: 'No command or category named "' + requested + '".' };
      }
      const categories = [
        "administration",
        "moderation",
        "information",
        "utility",
        "automation",
        "entertainment",
        "economy",
        "leveling",
        "games",
        "media",
        "ai",
      ] as const;
      const body = categories.map((category) =>
        listItem(
          CATEGORY_EMOJI[category] ?? "▸",
          `${category} (${registry.byCategory(category as Parameters<typeof registry.byCategory>[0]).length})`
        )
      );
      return {
        text: panel({
          title: "PANINDIGAN COMMANDS",
          tone: "info",
          subtitle: `Prefix: ${context.config.identity.commandPrefix}  ·  ${registry.size} commands in ${categories.length} categories`,
          lines: body,
          footer: "!help <category> or !help <command> for details",
        }),
      };
    },
  },
  {
    aliases: ["h"],
    usage: ["!help [category|command]", "!help economy"],
    examples: ["!help", "!help moderation", "!help daily"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: false,
  },
);
