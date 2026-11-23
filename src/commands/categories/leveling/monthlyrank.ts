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
    name: "monthlyrank",
    description:
      "Show the real XP leaderboard with an honest note that no monthly window is tracked.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const entries = await topEntries(context, 10);
        if (entries.length === 0)
          return { text: "No ranking data is available for this month or any other period yet." };
        const lines = entries.map(
          (entry, index) =>
            `#${index + 1} ${entry.facebookId} — level ${entry.level}, ${formatInteger(entry.xp)} XP`,
        );
        return {
          text:
            `🗓️ Monthly rank request — all-time XP leaderboard shown\n${lines.join("\n")}\n\n` +
            "No 30-day or calendar-month XP window is stored by the leveling service, so no monthly reset or monthly totals are claimed.",
        };
      } catch (error) {
        return { text: `Monthly ranking failed: ${failure(error)}. No ranking was produced.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!monthlyrank"],
    examples: ["!monthlyrank"],
    permission: "public",
    cooldownMs: 3000,
  },
);
