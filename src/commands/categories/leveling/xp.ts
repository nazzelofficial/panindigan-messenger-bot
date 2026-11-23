import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { levelFromXp } from "../../../databases/postgresql/repositories/leveling.js";
import { formatInteger } from "../../../utils/text.js";

interface LevelStats {
  readonly xp: number;
  readonly totalXp: number;
  readonly level: number;
}
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

function readLevel(value: unknown): LevelStats {
  const row = record(value);
  const xp = toNumber(row["xp"] ?? row["current_xp"]);
  const totalXp = toNumber(row["total_xp"] ?? row["totalXp"] ?? xp);
  const storedLevel = toNumber(row["level"]);
  return { xp, totalXp, level: storedLevel > 0 ? storedLevel : levelFromXp(xp) };
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
    name: "xp",
    description: "Show real current XP, lifetime XP and progress toward the next level.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const target = await resolveTarget(context);
        if (!target) return { text: "Usage: !xp [numeric Facebook ID]." };
        const stats = readLevel(await context.services.leveling.get(target.facebookId));
        const level = levelFromXp(stats.xp);
        const floor = (level - 1) * (level - 1) * 100;
        const ceiling = level * level * 100;
        const intoLevel = Math.max(0, stats.xp - floor);
        const span = ceiling - floor;
        const percent = span > 0 ? Math.min(100, Math.floor((intoLevel / span) * 100)) : 100;
        return {
          text:
            `⚡ ${target.displayName}\n` +
            `Current XP: ${formatInteger(stats.xp)}\n` +
            `Lifetime XP: ${formatInteger(stats.totalXp)}\n` +
            `Level: ${level}\n` +
            `Level progress: ${formatInteger(intoLevel)}/${formatInteger(span)} XP (${percent}%)\n` +
            `Remaining to level ${level + 1}: ${formatInteger(Math.max(0, ceiling - stats.xp))} XP`,
        };
      } catch (error) {
        return { text: `XP lookup failed: ${failure(error)}. No XP values were read.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!xp", "!xp <facebook ID>"],
    examples: ["!xp", "!xp 100009384756221"],
    permission: "public",
    cooldownMs: 2000,
  },
);
