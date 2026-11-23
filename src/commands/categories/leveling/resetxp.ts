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
    name: "resetxp",
    description: "Administrator-only: reset a user's current XP to zero.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      const targetId = context.args.positional[0];
      if (!targetId) return { text: "Usage: !resetxp <facebook ID>. No XP was changed." };
      try {
        const target = await resolveTarget(context);
        if (!target)
          return { text: `No known user matches Facebook ID ${targetId}. No XP was changed.` };
        const before = readLevel(await context.services.leveling.get(target.facebookId));
        await context.services.leveling.setXp(target.facebookId, 0);
        const after = readLevel(await context.services.leveling.get(target.facebookId));
        return {
          text:
            `♻️ Current XP reset for ${target.displayName} (${target.facebookId}).\n` +
            `Current XP: ${formatInteger(before.xp)} → ${formatInteger(after.xp)}\n` +
            `Level: ${before.level} → ${after.level} (computed via levelFromXp)\n` +
            `Lifetime XP remains ${formatInteger(after.totalXp)}.`,
        };
      } catch (error) {
        return { text: `XP reset failed: ${failure(error)}. No XP change was confirmed.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!resetxp <facebook ID>"],
    examples: ["!resetxp 100009384756221"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
