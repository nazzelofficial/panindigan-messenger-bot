import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function parseLevel(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

export default createCommand(
  {
    name: "setlevelreward",
    description:
      "Administrator-only: report the missing reward-storage API without saving a fake reward.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      const level = parseLevel(context.args.positional[0] ?? context.args.named["level"]);
      const reward = context.args.positional.slice(1).join(" ").trim();
      if (level === undefined || reward === "") {
        return { text: "Usage: !setlevelreward <level> <reward description>. Nothing was saved." };
      }
      return {
        text:
          `The leveling service in this build has no reward-storage API, so the reward for level ${level} was NOT saved. ` +
          `Requested description: "${reward.slice(0, 120)}". ` +
          "To enable persistent rewards, add a reward repository/service on context.services and re-enable this command. No configuration was changed.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!setlevelreward <level> <description>"],
    examples: ["!setlevelreward 10 100 coins", "!setlevelreward 25 VIP role"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
