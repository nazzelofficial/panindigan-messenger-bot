import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { loadConfiguration } from "../../../config/index.js";

export default createCommand(
  {
    name: "reload",
    description: "Re-validate config.json and refresh safe runtime overrides (owner only).",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const fresh = loadConfiguration();
        await context.services.cache.set(
          "runtime:prefix",
          fresh.config.identity.commandPrefix,
          60 * 60 * 24 * 30,
        );
        for (const [name, enabled] of Object.entries(fresh.config.modules)) {
          await context.services.cache.set("runtime:module:" + name, enabled, 60 * 60 * 24 * 30);
        }
        return {
          text:
            "Configuration re-validated. Safe runtime overrides refreshed from config.json.\nWarnings: " +
            (fresh.warnings.length ? fresh.warnings.join("; ") : "none"),
        };
      } catch (error) {
        return {
          text:
            "Reload failed: " +
            (error instanceof Error ? error.message : "unknown error") +
            " The running configuration was not changed.",
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!reload"],
    examples: ["!reload"],
    permission: "owner",
    cooldownMs: 2000,
    maintenanceSafe: false,
  },
);
