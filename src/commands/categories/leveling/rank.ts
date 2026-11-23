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
interface TopEntry {
  readonly facebookId: string;
  readonly xp: number;
  readonly level: number;
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

function xpForLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  return (safe - 1) * (safe - 1) * 100;
}

function progress(stats: LevelStats): {
  readonly current: number;
  readonly needed: number;
  readonly percent: number;
} {
  const floor = xpForLevel(stats.level);
  const ceiling = xpForLevel(stats.level + 1);
  const span = ceiling - floor;
  const current = Math.max(0, stats.xp - floor);
  return {
    current,
    needed: span,
    percent: span > 0 ? Math.min(100, Math.floor((current / span) * 100)) : 100,
  };
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

async function topEntries(context: CommandContext, limit: number): Promise<TopEntry[]> {
  const rows: unknown = await context.services.leveling.top(limit);
  const values: readonly unknown[] = Array.isArray(rows) ? (rows as readonly unknown[]) : [];
  const entries: TopEntry[] = [];
  for (const item of values) {
    const row = record(item);
    const rawId = row["facebook_id"] ?? row["facebookId"];
    const facebookId =
      typeof rawId === "string" ? rawId : typeof rawId === "number" ? String(rawId) : "";
    if (facebookId === "") continue;
    const xp = toNumber(row["xp"] ?? row["total_xp"]);
    const level = toNumber(row["level"]) || levelFromXp(xp);
    entries.push({ facebookId, xp, level, displayName: facebookId });
  }
  return entries.sort((a, b) => b.xp - a.xp);
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "rank",
    description:
      "Show your real level, XP and leaderboard position, or another user's by Facebook ID.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const target = await resolveTarget(context);
        if (!target)
          return { text: "Usage: !rank [numeric Facebook ID]. The ID must be 5-25 digits." };
        const stats = readLevel(await context.services.leveling.get(target.facebookId));
        const entries = await topEntries(context, 100);
        const index = entries.findIndex((entry) => entry.facebookId === target.facebookId);
        const rankText =
          index >= 0
            ? `#${index + 1} within the sampled top ${entries.length}`
            : "outside the sampled top 100";
        const bar = progress(stats);
        return {
          text:
            `🏆 ${target.displayName} — rank ${rankText}\n` +
            `Level: ${stats.level}\n` +
            `Current XP: ${formatInteger(stats.xp)}\n` +
            `Lifetime XP: ${formatInteger(stats.totalXp)}\n` +
            `Progress to level ${stats.level + 1}: ${formatInteger(bar.current)}/${formatInteger(bar.needed)} XP (${bar.percent}%)`,
        };
      } catch (error) {
        return { text: `Rank lookup failed: ${failure(error)}. No result was produced.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!rank", "!rank <facebook ID>"],
    examples: ["!rank", "!rank 100009384756221"],
    permission: "public",
    cooldownMs: 2000,
  },
);
