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
    name: "leveldown",
    description: "Preview which level a loss of N levels would produce from your real XP.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = Number(context.args.positional[1] ?? "1");
      const steps =
        Number.isInteger(requested) && requested >= 1 && requested <= 100 ? requested : 1;
      try {
        const target = await resolveTarget(context);
        if (!target) return { text: "Usage: !leveldown [facebook ID] [levels]." };
        const row = record(await context.services.leveling.get(target.facebookId));
        const xp = toNumber(row["xp"] ?? row["current_xp"]);
        const currentLevel = levelFromXp(xp);
        const desiredLevel = Math.max(1, currentLevel - steps);
        const xpAtTarget = (desiredLevel - 1) * (desiredLevel - 1) * 100;
        const resultingLevel = levelFromXp(xpAtTarget);
        return {
          text:
            `⬇️ ${target.displayName}: level preview\n` +
            `Current XP: ${formatInteger(xp)} (level ${currentLevel})\n` +
            `Levels requested: ${steps}\n` +
            `XP at level ${desiredLevel}: ${formatInteger(xpAtTarget)}\n` +
            `XP that would be removed: ${formatInteger(Math.max(0, xp - xpAtTarget))}\n` +
            `Resulting level computed from that XP: ${resultingLevel}\n` +
            "This is a preview only — no XP was changed. An administrator can remove XP with !removexp or set it with !setxp.",
        };
      } catch (error) {
        return { text: `Level preview failed: ${failure(error)}. No XP was changed.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!leveldown [facebook ID] [levels]"],
    examples: ["!leveldown", "!leveldown 100009384756221 2"],
    permission: "public",
    cooldownMs: 2000,
  },
);
