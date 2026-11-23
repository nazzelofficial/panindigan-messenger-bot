import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "disable",
    description: "Disable a feature module at runtime (owner only).",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const name = context.args.positional[0];
      if (!name || !(name in context.config.modules))
        return { text: "Usage: !disable <module>. Use !modules to see valid names." };
      if (name === "maintenance" || name === "announcements")
        return { text: "Core maintenance and announcement modules cannot be disabled at runtime." };
      await context.services.cache.set("runtime:module:" + name, false, 60 * 60 * 24 * 30);
      return { text: "Module **" + name + "** disabled at runtime." };
    },
  },
  {
    aliases: [],
    usage: ["!disable <module>"],
    examples: ["!disable games"],
    permission: "owner",
    cooldownMs: 1000,
    maintenanceSafe: false,
  },
);
