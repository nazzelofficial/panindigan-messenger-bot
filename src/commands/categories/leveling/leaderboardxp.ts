import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { levelFromXp } from "../../../databases/postgresql/repositories/leveling.js";
import { formatInteger } from "../../../utils/text.js";

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

async function withNames(
  context: CommandContext,
  entries: readonly TopEntry[],
): Promise<TopEntry[]> {
  const resolved: TopEntry[] = [];
  for (const entry of entries) {
    let displayName = entry.facebookId;
    try {
      const profile = await context.messenger.getUser(entry.facebookId);
      const name = profile?.name ?? profile?.firstName ?? null;
      if (typeof name === "string" && name !== "") displayName = name;
    } catch {
      // Keep the real Facebook ID as the label.
    }
    resolved.push({ ...entry, displayName });
  }
  return resolved;
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "leaderboardxp",
    description: "List the real top XP holders from the leveling leaderboard.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = Number(context.args.positional[0] ?? "10");
      const limit =
        Number.isInteger(requested) && requested >= 1 && requested <= 25 ? requested : 10;
      try {
        const entries = await withNames(context, await topEntries(context, limit));
        if (entries.length === 0) return { text: "The XP leaderboard is currently empty." };
        const lines = entries.map(
          (entry, index) =>
            `#${index + 1} ${entry.displayName} — level ${entry.level}, ${formatInteger(entry.xp)} XP`,
        );
        return {
          text: `🏆 Top ${entries.length} by XP (real leaderboard data):\n${lines.join("\n")}`,
        };
      } catch (error) {
        return { text: `Leaderboard lookup failed: ${failure(error)}. No ranking was produced.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!leaderboardxp", "!leaderboardxp <1-25>"],
    examples: ["!leaderboardxp", "!leaderboardxp 15"],
    permission: "public",
    cooldownMs: 3000,
  },
);
