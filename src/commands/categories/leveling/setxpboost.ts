import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface Target {
  readonly facebookId: string;
  readonly displayName: string;
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
    name: "setxpboost",
    description: "Administrator-only: add a real time-limited XP multiplier boost for a user.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      const targetId = context.args.positional[0];
      const multiplier = Number(context.args.positional[1] ?? context.args.named["multiplier"]);
      const hours = Number(context.args.positional[2] ?? context.args.named["hours"]);
      if (
        !targetId ||
        !Number.isFinite(multiplier) ||
        multiplier < 1.01 ||
        multiplier > 10 ||
        !Number.isInteger(hours) ||
        hours < 1 ||
        hours > 720
      ) {
        return {
          text: "Usage: !setxpboost <facebook ID> <multiplier 1.01-10> <hours 1-720>. No boost was added.",
        };
      }
      try {
        const target = await resolveTarget(context);
        if (!target)
          return { text: `No known user matches Facebook ID ${targetId}. No boost was added.` };
        const expiresAt = new Date(Date.now() + hours * 3_600_000);
        await context.services.leveling.addBoost(target.facebookId, multiplier, expiresAt);
        return {
          text:
            `⚡ Boost added for ${target.displayName} (${target.facebookId}).\n` +
            `Multiplier: ×${multiplier}\n` +
            `Expires at: ${expiresAt.toISOString()} (${hours} hours from now)\n` +
            "The multiplier is stored by the leveling service; !xpboost cannot display active multipliers because no query API exists.",
        };
      } catch (error) {
        return { text: `Adding XP boost failed: ${failure(error)}. No boost was confirmed.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!setxpboost <facebook ID> <multiplier> <hours>"],
    examples: [
      "!setxpboost 100009384756221 2 24",
      "!setxpboost 100009384756221 --multiplier=1.5 --hours=12",
    ],
    permission: "admin",
    cooldownMs: 2000,
  },
);
