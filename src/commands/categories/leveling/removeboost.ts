import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

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
    name: "removeboost",
    description: "Administrator-only: remove all XP boosts from a user and report the real count.",
    category: "leveling",
    async run(context: CommandContext): Promise<CommandResult> {
      const targetId = context.args.positional[0];
      if (!targetId) return { text: "Usage: !removeboost <facebook ID>. No boosts were removed." };
      try {
        const target = await resolveTarget(context);
        if (!target)
          return { text: `No known user matches Facebook ID ${targetId}. No boosts were removed.` };
        const removed = toNumber(await context.services.leveling.removeBoosts(target.facebookId));
        return {
          text:
            `🧹 Boost removal completed for ${target.displayName} (${target.facebookId}).\n` +
            `Boost entries removed: ${removed}\n` +
            "This count comes directly from the leveling service.",
        };
      } catch (error) {
        return { text: `Removing boosts failed: ${failure(error)}. No removal was confirmed.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!removeboost <facebook ID>"],
    examples: ["!removeboost 100009384756221"],
    permission: "admin",
    cooldownMs: 2000,
  },
);
