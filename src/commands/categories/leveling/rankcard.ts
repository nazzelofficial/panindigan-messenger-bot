import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { levelFromXp } from "../../../databases/postgresql/repositories/leveling.js";
import { formatInteger } from "../../../utils/text.js";

interface Target {
  readonly facebookId: string;
  readonly displayName: string;
}
interface TopEntry {
  readonly facebookId: string;
  readonly xp: number;
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
    entries.push({ facebookId, xp: toNumber(row["xp"] ?? row["total_xp"]) });
  }
  return entries.sort((a, b) => b.xp - a.xp);
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "rankcard",
    description: "Render a text rank card from a user's real XP, level and leaderboard position.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const target = await resolveTarget(context);
        if (!target) return { text: "Usage: !rankcard [facebook ID]." };
        const row = record(await context.services.leveling.get(target.facebookId));
        const xp = toNumber(row["xp"] ?? row["current_xp"]);
        const totalXp = toNumber(row["total_xp"] ?? row["totalXp"] ?? xp);
        const level = levelFromXp(xp);
        const floorXp = (level - 1) * (level - 1) * 100;
        const ceilingXp = level * level * 100;
        const span = ceilingXp - floorXp;
        const percent = span > 0 ? Math.min(100, Math.floor(((xp - floorXp) / span) * 100)) : 100;
        const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
        const bar = "█".repeat(filled) + "░".repeat(10 - filled);
        const entries = await topEntries(context, 100);
        const index = entries.findIndex((entry) => entry.facebookId === target.facebookId);
        const rankText = index >= 0 ? `#${index + 1}` : "unranked";
        return {
          text:
            `╔═══════════════════════════╗\n` +
            `║  RANK CARD — ${target.displayName.slice(0, 20)}\n` +
            `╠═══════════════════════════╣\n` +
            `║  Level      : ${level}\n` +
            `║  Rank       : ${rankText}\n` +
            `║  Current XP : ${formatInteger(xp)}\n` +
            `║  Lifetime XP: ${formatInteger(totalXp)}\n` +
            `║  Next level : ${formatInteger(Math.max(0, ceilingXp - xp))} XP\n` +
            `║  Progress   : ${bar} ${percent}%\n` +
            `╚═══════════════════════════╝`,
        };
      } catch (error) {
        return { text: `Rank card failed: ${failure(error)}. No card was rendered.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!rankcard", "!rankcard <facebook ID>"],
    examples: ["!rankcard", "!rankcard 100009384756221"],
    permission: "public",
    cooldownMs: 2000,
  },
);
