import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "enable",
    description: "Enable a feature module at runtime (owner only).",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const name = context.args.positional[0];
      if (!name || !(name in context.config.modules))
        return { text: "Usage: !enable <module>. Use !modules to see valid names." };
      await context.services.cache.set("runtime:module:" + name, true, 60 * 60 * 24 * 30);
      return { text: "Module **" + name + "** enabled at runtime." };
    },
  },
  {
    aliases: [],
    usage: ["!enable <module>"],
    examples: ["!enable economy"],
    permission: "owner",
    cooldownMs: 1000,
    maintenanceSafe: false,
  },
);
