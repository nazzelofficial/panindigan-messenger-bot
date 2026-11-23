import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { levelFromXp } from "../../../databases/postgresql/repositories/leveling.js";
import { formatInteger } from "../../../utils/text.js";

interface TopEntry {
  readonly facebookId: string;
  readonly xp: number;
  readonly level: number;
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
    entries.push({ facebookId, xp, level });
  }
  return entries.sort((a, b) => b.xp - a.xp);
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "levelstats",
    description: "Report aggregate XP and level statistics computed from the real leaderboard.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const entries = await topEntries(context, 100);
        if (entries.length === 0) return { text: "No leveling data is available yet." };
        const total = entries.reduce((sum, entry) => sum + entry.xp, 0);
        const highestXp = entries[0]!.xp;
        const highestLevel = entries.reduce((maximum, entry) => Math.max(maximum, entry.level), 1);
        return {
          text:
            `📈 Leveling statistics (sample: top ${entries.length} leaderboard rows)\n` +
            `Highest XP: ${formatInteger(highestXp)}\n` +
            `Highest level: ${highestLevel}\n` +
            `Average XP in sample: ${formatInteger(Math.round(total / entries.length))}\n` +
            `Combined XP in sample: ${formatInteger(total)}\n` +
            "These figures are computed from actual stored rows, not estimates.",
        };
      } catch (error) {
        return { text: `Level statistics failed: ${failure(error)}. No figures were computed.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!levelstats"],
    examples: ["!levelstats"],
    permission: "public",
    cooldownMs: 3000,
  },
);
