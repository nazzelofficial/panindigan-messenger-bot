import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function parseLevel(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

export default createCommand(
  {
    name: "removelevelreward",
    description:
      "Administrator-only: report the missing reward-storage API without claiming a removal.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      const level = parseLevel(context.args.positional[0] ?? context.args.named["level"]);
      if (level === undefined)
        return { text: "Usage: !removelevelreward <level>. Nothing was removed." };
      return {
        text:
          `No reward for level ${level} was removed: the leveling service in this build exposes no reward lookup or deletion API. ` +
          "Configure a reward repository/service on context.services before using this command. No data was changed.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!removelevelreward <level>"],
    examples: ["!removelevelreward 10", "!removelevelreward --level=25"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
