import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "commands",
    description: "List commands in a compact index grouped by category.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const { CommandRegistry } = await import("../../registry.js");
      const { loadAllCommands } = await import("../../loader.js");
      const registry = new CommandRegistry();
      for (const command of loadAllCommands(context.config)) registry.register(command);
      const filter = context.args.positional[0]?.toLowerCase();
      const categories = filter
        ? [filter]
        : [
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
          ];
      const lines = ["📋 COMMAND INDEX"];
      for (const category of categories) {
        const commands = registry.byCategory(category as Parameters<typeof registry.byCategory>[0]);
        lines.push(
          "",
          "[" + category.toUpperCase() + "] " + commands.length,
          commands.map((c: { name: string }) => c.name).join(", "),
        );
      }
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!commands [category]"],
    examples: ["!commands", "!commands games"],
    permission: "public",
    cooldownMs: 1200,
    maintenanceSafe: true,
  },
);
