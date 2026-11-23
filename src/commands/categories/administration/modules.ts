import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "modules",
    description: "List top-level feature modules and their runtime state.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const entries = await Promise.all(
        Object.entries(context.config.modules).map(async ([name, value]) => {
          const override = await context.services.cache.get("runtime:module:" + name);
          return "• " + name + ": " + ((override ?? value) ? "enabled" : "disabled");
        }),
      );
      return { text: "🧩 MODULES\n\n" + entries.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!modules"],
    examples: ["!modules"],
    permission: "admin",
    cooldownMs: 1000,
    maintenanceSafe: true,
  },
);
