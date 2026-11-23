import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

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
          return {
            text: [
              "📖 " + command.name.toUpperCase(),
              "",
              command.description,
              "",
              "Usage: " + command.usage.join("\nUsage: "),
              command.aliases.length ? "Aliases: " + command.aliases.join(", ") : "",
              command.examples.length ? "Examples: " + command.examples.join(" | ") : "",
            ]
              .filter(Boolean)
              .join("\n"),
          };
        }
        const byCategory = registry.byCategory(
          requested as Parameters<typeof registry.byCategory>[0],
        );
        if (byCategory.length > 0) {
          return {
            text:
              "📖 " +
              requested.toUpperCase() +
              " (" +
              byCategory.length +
              ")\n\n" +
              byCategory
                .map(
                  (c: { name: string; description: string }) =>
                    "• " + c.name + " — " + c.description,
                )
                .join("\n"),
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
      const lines = [
        "📖 PANINDIGAN COMMANDS",
        "",
        "Prefix: " + context.config.identity.commandPrefix,
        "Total: " + registry.size + " commands in 11 categories",
        "",
      ];
      for (const category of categories) {
        lines.push(
          "• " +
            category +
            " — " +
            registry.byCategory(category as Parameters<typeof registry.byCategory>[0]).length +
            " commands",
        );
      }
      lines.push("", "Use !help <category> or !help <command> for details.");
      return { text: lines.join("\n") };
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
