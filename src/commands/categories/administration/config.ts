import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "config",
    description: "Show a safe summary of the authoritative configuration.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      return {
        text:
          JSON.stringify(
            {
              application: context.config.application,
              identity: {
                botName: context.config.identity.botName,
                commandPrefix: context.config.identity.commandPrefix,
              },
              commands: context.config.commands,
              modules: context.config.modules,
              economy: context.config.economy,
              maintenance: context.config.maintenance,
            },
            null,
            2,
          ).slice(0, 1900) + "\n\nSecrets are stored only in environment variables.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!config"],
    examples: ["!config"],
    permission: "owner",
    cooldownMs: 1200,
    maintenanceSafe: false,
  },
);
