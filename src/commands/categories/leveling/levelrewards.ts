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
    name: "levelrewards",
    description: "List every five-level milestone already reached, derived from real XP.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const target = await resolveTarget(context);
        if (!target) return { text: "Usage: !levelrewards [facebook ID]." };
        const row = record(await context.services.leveling.get(target.facebookId));
        const xp = toNumber(row["xp"] ?? row["current_xp"]);
        const level = levelFromXp(xp);
        const reached: number[] = [];
        for (let milestone = 5; milestone <= level; milestone += 5) reached.push(milestone);
        const next = (Math.floor(level / 5) + 1) * 5;
        const remaining = (next - 1) * (next - 1) * 100 - xp;
        return {
          text:
            `🎖️ ${target.displayName} — level ${level} from ${formatInteger(xp)} XP\n` +
            (reached.length > 0
              ? `Milestones reached: ${reached.join(", ")}\n`
              : "Milestones reached: none yet\n") +
            `Next milestone: level ${next} (${formatInteger(Math.max(0, remaining))} XP away)\n` +
            "Rewards themselves are not configured; this list is computed from stored XP only.",
        };
      } catch (error) {
        return {
          text: `Level rewards lookup failed: ${failure(error)}. No milestones were computed.`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!levelrewards [facebook ID]"],
    examples: ["!levelrewards", "!levelrewards 100009384756221"],
    permission: "public",
    cooldownMs: 2000,
  },
);
