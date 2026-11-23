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
    name: "xpboost",
    description: "Explain the missing boost-listing API while showing real XP for the target user.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const target = await resolveTarget(context);
        if (!target) return { text: "Usage: !xpboost [facebook ID]." };
        const row = record(await context.services.leveling.get(target.facebookId));
        const xp = toNumber(row["xp"] ?? row["current_xp"]);
        return {
          text:
            `⚡ ${target.displayName}\n` +
            `Current XP: ${formatInteger(xp)} (level ${levelFromXp(xp)})\n` +
            "Active boost multipliers cannot be listed: the leveling service exposes addBoost and removeBoosts but no boost-query method, so no multiplier or expiry is claimed. " +
            "Administrators can use !setxpboost <facebook ID> <multiplier> <hours> and !removeboost <facebook ID>. No boost was applied or removed here.",
        };
      } catch (error) {
        return { text: `Boost lookup failed: ${failure(error)}. No boost was applied.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!xpboost [facebook ID]"],
    examples: ["!xpboost", "!xpboost 100009384756221"],
    permission: "public",
    cooldownMs: 2000,
  },
);
