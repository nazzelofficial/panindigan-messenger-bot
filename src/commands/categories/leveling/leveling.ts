import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { levelFromXp } from "../../../databases/postgresql/repositories/leveling.js";
import { formatInteger } from "../../../utils/text.js";

interface Target {
  readonly facebookId: string;
  readonly displayName: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))
    return Number(value);
  return 0;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

async function resolveTarget(context: CommandContext): Promise<Target | undefined> {
  const raw = context.args.positional[0] ?? context.senderId;
  if (!/^\d{5,25}$/.test(raw)) return undefined;
  let displayName = raw;
  try {
    const profile = await context.messenger.getUser(raw);
    const name = profile?.name ?? profile?.firstName ?? null;
    if (typeof name === "string" && name !== "") displayName = name;
  } catch {
    // The Facebook ID stays a valid label when the profile lookup fails.
  }
  return { facebookId: raw, displayName };
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "leveling",
    description: "Explain the leveling system and show the caller's real XP and level.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const target = await resolveTarget(context);
        if (!target) return { text: "Usage: !leveling." };
        const row = record(await context.services.leveling.get(target.facebookId));
        const xp = toNumber(row["xp"] ?? row["current_xp"]);
        const level = levelFromXp(xp);
        return {
          text:
            `📶 Leveling overview\n` +
            `Module enabled: ${context.config.modules.leveling ? "yes" : "no"}\n` +
            `Your record: level ${level}, ${formatInteger(xp)} current XP\n` +
            `Next level starts at ${formatInteger(level * level * 100)} XP\n` +
            "Formula: level = floor(sqrt(XP / 100)) + 1 (minimum 1).\n" +
            "Progress: !rank, !level, !xp, !leaderboardxp, !levelstats, !rankcard, !topusers.\n" +
            "Previews: !levelup, !leveldown. Rankings: !activityrank, !weeklyrank, !monthlyrank.\n" +
            "Milestones: !rewardslevel, !levelrewards. Boost info: !xpboost.\n" +
            "Rewards are not persisted in this build, and weekly/monthly windows are not stored; those commands say so explicitly.",
        };
      } catch (error) {
        return { text: `Leveling overview failed: ${failure(error)}. No stats were read.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!leveling"],
    examples: ["!leveling"],
    permission: "public",
    cooldownMs: 2000,
  },
);
